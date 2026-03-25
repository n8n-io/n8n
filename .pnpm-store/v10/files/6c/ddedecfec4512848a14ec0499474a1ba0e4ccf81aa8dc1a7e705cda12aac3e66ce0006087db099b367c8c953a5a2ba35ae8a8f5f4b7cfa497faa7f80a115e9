const { spawnSync } = require("child_process");
const { getExePath } = require("./get-exe");

function install() {
  if (process.env.CI) {
    return;
  }

  spawnSync(getExePath(), ["install", "-f"], {
    cwd: process.env.INIT_CWD || process.cwd(),
    stdio: "inherit",
  });
}

try {
  install();
} catch (e) {
  console.warn(
    "'lefthook install' command failed. Try running it manually.\n" + e,
  );
}
