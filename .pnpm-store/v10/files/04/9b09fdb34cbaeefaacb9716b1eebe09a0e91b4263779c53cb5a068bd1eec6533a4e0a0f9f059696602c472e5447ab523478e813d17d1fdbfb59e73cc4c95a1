const { spawnSync } = require("child_process");
const { getExePath } = require("./get-exe");

function install() {
  const isEnabled = (value) => value && value !== "0" && value !== "false";
  if (isEnabled(process.env.CI) && !isEnabled(process.env.LEFTHOOK)) {
    return
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
