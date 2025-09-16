#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import semver from 'semver';
import { MAIN_PACKAGES } from './constants.mjs';

/**
 * Version independent packages based on conventional commits
 * Usage: node version-independent-packages.mjs [--dry-run]
 */

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean' }
  }
});

function analyzeCommitType(subject) {
  if (subject.includes('!:') || subject.includes('BREAKING CHANGE')) return 'major';
  if (subject.startsWith('feat')) return 'minor';
  if (subject.startsWith('fix') || subject.startsWith('perf')) return 'patch';
  return null;
}

function determineVersionBump(commits) {
  let bumpType = null;
  for (const commit of commits) {
    const commitType = analyzeCommitType(commit.subject);
    if (commitType === 'major') return 'major';
    if (commitType === 'minor' && bumpType !== 'major') bumpType = 'minor';
    if (commitType === 'patch' && !bumpType) bumpType = 'patch';
  }
  return bumpType;
}

try {
  console.log('Versioning independent packages...');

  // Use pnpm to discover all workspace packages
  const workspacePackages = JSON.parse(execSync('pnpm list -r --json --depth 0', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }));

  // Filter out main packages and private packages
  const independentPackages = [];

  for (const packageData of workspacePackages) {
    if (!packageData.path || !packageData.name) continue;

    const packageFile = `${packageData.path}/package.json`;
    try {
      const packageInfo = JSON.parse(readFileSync(packageFile, 'utf8'));
      const { name, version: currentVersion, private: isPrivate } = packageInfo;

      // Skip if private or if it's a main package
      if (isPrivate) continue;
      if (MAIN_PACKAGES.some(mainPath => packageData.path.endsWith(mainPath))) continue;

      independentPackages.push({
        name,
        version: currentVersion,
        packageFile,
        packageDir: packageData.path
      });
    } catch (error) {
      console.log(`Skipping ${packageFile}: ${error.message}`);
    }
  }

  const versionedPackages = [];

  for (const pkg of independentPackages) {
    try {
      const { name: packageName, version: currentVersion, packageFile, packageDir } = pkg;

      // Check if version was manually changed
      const oldVersion = execSync(`git show HEAD^:"${packageFile}" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).version" 2>/dev/null || echo ""`, { encoding: 'utf8' }).trim();

      if (currentVersion !== oldVersion) {
        console.log(`✓ Version already manually updated: ${oldVersion} → ${currentVersion}`);
        versionedPackages.push({ name: packageName, oldVersion, newVersion: currentVersion, packageFile, bumpType: 'manual' });
        continue;
      }

      // Get commits from this push that affected this package
      // Use the GitHub event context if available, otherwise fall back to HEAD^..HEAD
      const gitRange = process.env.GITHUB_BEFORE && process.env.GITHUB_SHA
        ? `${process.env.GITHUB_BEFORE}..${process.env.GITHUB_SHA}`
        : 'HEAD^..HEAD';

      const commits = execSync(`git log --format="%H|%s" ${gitRange} -- "${packageDir}/**" || true`, { encoding: 'utf8' })
        .trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, subject] = line.split('|');
          return { hash: hash?.trim(), subject: subject?.trim() };
        })
        .filter(commit => commit.hash && commit.subject);

      if (commits.length === 0) continue;

      const bumpType = determineVersionBump(commits);
      if (!bumpType) continue;

      const newVersion = semver.inc(currentVersion, bumpType);
      if (!newVersion) {
        console.error(`Could not calculate new version for ${packageName}`);
        continue;
      }

      console.log(`${args['dry-run'] ? '[DRY-RUN] Would bump' : 'Bumping'} ${packageName}: ${currentVersion} → ${newVersion} (${bumpType})`);

      if (!args['dry-run']) {
        packageInfo.version = newVersion;
        writeFileSync(packageFile, JSON.stringify(packageInfo, null, 2) + '\n');
      }

      versionedPackages.push({ name: packageName, oldVersion: currentVersion, newVersion, packageFile, bumpType });
    } catch (error) {
      console.log(`Skipping ${packageFile}: ${error.message}`);
    }
  }

  // Commit changes
  if (versionedPackages.length > 0 && !args['dry-run']) {
    const autoBumpedPackages = versionedPackages.filter(p => p.bumpType !== 'manual');
    if (autoBumpedPackages.length > 0) {
      const filesToAdd = autoBumpedPackages.map(p => p.packageFile).join(' ');
      execSync(`git add ${filesToAdd}`);

      const commitMessage = autoBumpedPackages.length === 1
        ? `chore: Version bump ${autoBumpedPackages[0].name} to ${autoBumpedPackages[0].newVersion}`
        : `chore: Version bump ${autoBumpedPackages.length} independent packages\n\n${autoBumpedPackages.map(p => `- ${p.name}: ${p.oldVersion} → ${p.newVersion}`).join('\n')}`;

      execSync(`git commit -m "${commitMessage}"`);
      console.log('✓ Committed version changes');
    }
  }

  if (versionedPackages.length > 0) {
    console.log(`Processed ${versionedPackages.length} package(s):`);
    for (const pkg of versionedPackages) {
      const action = pkg.bumpType === 'manual' ? 'manually updated' : `auto-bumped (${pkg.bumpType})`;
      console.log(`  ${pkg.name}: ${pkg.oldVersion} → ${pkg.newVersion} (${action})`);
    }
  } else {
    console.log('No packages need versioning');
  }

} catch (error) {
  console.error('Script failed:', error.message);
  process.exit(1);
}