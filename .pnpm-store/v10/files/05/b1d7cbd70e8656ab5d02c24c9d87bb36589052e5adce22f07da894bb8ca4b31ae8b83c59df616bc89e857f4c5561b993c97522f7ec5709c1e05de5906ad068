import { a as globalLogger, t as version } from "./package-B-bDWI0Z.mjs";
import process from "node:process";
import { bold, green, underline } from "ansis";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";

//#region src/migrate.ts
async function migrate({ cwd, dryRun }) {
	if (dryRun) globalLogger.info("Dry run enabled. No changes were made.");
	else {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout
		});
		globalLogger.warn(`\n\nBefore proceeding, review the migration guide at ${underline`https://tsdown.dev/guide/migrate-from-tsup`}, as this process will modify your files.\nUncommitted changes will be lost. Use the ${green`--dry-run`} flag to preview changes without applying them.`);
		const input = await rl.question(bold`Continue? (Y/n) `);
		rl.close();
		if (!(input.toLowerCase() === "y" || input === "")) {
			globalLogger.error("Migration cancelled.");
			process.exitCode = 1;
			return;
		}
	}
	if (cwd) process.chdir(cwd);
	let migrated = await migratePackageJson(dryRun);
	if (await migrateTsupConfig(dryRun)) migrated = true;
	if (migrated) globalLogger.success("Migration completed. Remember to run install command with your package manager.");
	else {
		globalLogger.error("No migration performed.");
		process.exitCode = 1;
	}
}
const DEP_FIELDS = {
	dependencies: `^${version}`,
	devDependencies: `^${version}`,
	peerDependencies: "*"
};
async function migratePackageJson(dryRun) {
	if (!existsSync("package.json")) {
		globalLogger.error("No package.json found");
		return false;
	}
	const pkgRaw = await readFile("package.json", "utf8");
	let pkg = JSON.parse(pkgRaw);
	let found = false;
	for (const [field, semver] of Object.entries(DEP_FIELDS)) if (pkg[field]?.tsup) {
		globalLogger.info(`Migrating \`${field}\` to tsdown.`);
		found = true;
		pkg[field] = renameKey(pkg[field], "tsup", "tsdown", semver);
	}
	if (pkg.scripts) {
		for (const key of Object.keys(pkg.scripts)) if (pkg.scripts[key].includes("tsup")) {
			globalLogger.info(`Migrating \`${key}\` script to tsdown`);
			found = true;
			pkg.scripts[key] = pkg.scripts[key].replaceAll(/tsup(?:-node)?/g, "tsdown");
		}
	}
	if (pkg.tsup) {
		globalLogger.info("Migrating `tsup` field in package.json to `tsdown`.");
		found = true;
		pkg = renameKey(pkg, "tsup", "tsdown");
	}
	if (!found) {
		globalLogger.warn("No tsup-related fields found in package.json");
		return false;
	}
	const pkgStr = `${JSON.stringify(pkg, null, pkgRaw.includes("	") ? "	" : 2)}\n`;
	if (dryRun) {
		const { createPatch } = await import("diff");
		globalLogger.info("[dry-run] package.json:");
		console.info(createPatch("package.json", pkgRaw, pkgStr));
	} else {
		await writeFile("package.json", pkgStr);
		globalLogger.success("Migrated `package.json`");
	}
	return true;
}
const TSUP_FILES = [
	"tsup.config.ts",
	"tsup.config.cts",
	"tsup.config.mts",
	"tsup.config.js",
	"tsup.config.cjs",
	"tsup.config.mjs",
	"tsup.config.json"
];
async function migrateTsupConfig(dryRun) {
	let found = false;
	for (const file of TSUP_FILES) {
		if (!existsSync(file)) continue;
		globalLogger.info(`Found \`${file}\``);
		found = true;
		const tsupConfigRaw = await readFile(file, "utf8");
		const tsupConfig = tsupConfigRaw.replaceAll(/\btsup\b/g, "tsdown").replaceAll(/\bTSUP\b/g, "TSDOWN");
		const renamed = file.replaceAll("tsup", "tsdown");
		if (dryRun) {
			const { createTwoFilesPatch } = await import("diff");
			globalLogger.info(`[dry-run] ${file} -> ${renamed}:`);
			console.info(createTwoFilesPatch(file, renamed, tsupConfigRaw, tsupConfig));
		} else {
			await writeFile(renamed, tsupConfig, "utf8");
			await unlink(file);
			globalLogger.success(`Migrated \`${file}\` to \`${renamed}\``);
		}
	}
	if (!found) globalLogger.warn("No tsup config found");
	return found;
}
function renameKey(obj, oldKey, newKey, newValue) {
	const newObj = {};
	for (const key of Object.keys(obj)) if (key === oldKey) newObj[newKey] = newValue || obj[oldKey];
	else newObj[key] = obj[key];
	return newObj;
}

//#endregion
export { migrate };