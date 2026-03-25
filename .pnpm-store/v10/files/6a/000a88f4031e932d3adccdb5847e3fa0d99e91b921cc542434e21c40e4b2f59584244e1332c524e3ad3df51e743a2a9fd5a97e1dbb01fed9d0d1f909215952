import { execSync } from "node:child_process";
import { globSync } from "glob";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

type Result = {
  file: string;
  success: boolean;
};

const results: Result[] = [];

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
  .option("files", {
    alias: "f",
    description: "Specify files to test",
    type: "array",
  })
  .help()
  .alias("help", "h").argv;

const filesFromArgs = argv.files;

// If no files are specified, run all tests
const files =
  filesFromArgs && filesFromArgs.length > 0
    ? filesFromArgs
    : globSync("src/**/*.ts");

for (const file of files) {
  try {
    execSync(`npm run script -- ${file}`, { stdio: "inherit" });
    results.push({ file, success: true });
  } catch (error) {
    results.push({ file, success: false });
  }
}

const failedCount = results.filter((x) => !x.success).length;

if (failedCount > 0) {
  console.log(`❌ ${failedCount}/${results.length} examples failed to run:`);
} else {
  console.log(`🎉 All examples ran successfully!`);
}

for (const result of results) {
  console.log(`  - ${result.success ? "✅" : "❌"} ${result.file}`);
}

if (failedCount > 0) {
  process.exit(1);
}
