import { trySh } from './github-helpers.mjs';
import { getMonorepoProjects } from './pnpm-utils.mjs';

async function setLatestForMonorepoPackages() {
	const packages = await getMonorepoProjects();

	const publishedPackages = packages //
		.filter((pkg) => !pkg.private)
		.filter((pkg) => pkg.version);

	for (const pkg of publishedPackages) {
		const versionName = `${pkg.name}@${pkg.version}`;
		const res = trySh('npm', ['dist-tag', 'add', versionName, 'latest']);
		if (res.ok) {
			console.log(`Set ${versionName} as latest`);
		} else {
			console.warn(`Update failed for ${versionName}`);
		}
	}
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	setLatestForMonorepoPackages().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
