const { platform, arch } = process;
// biome-ignore lint/style/useNodejsImportProtocol: would be a breaking change, consider bumping node version next major version
const { execSync } = require("child_process");

function isMusl() {
	let stderr;
	try {
		stderr = execSync("ldd --version", {
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch (err) {
		stderr = err.stderr;
	}
	if (stderr.indexOf("musl") > -1) {
		return true;
	}
	return false;
}

const PLATFORMS = {
	win32: {
		x64: "@biomejs/cli-win32-x64/biome.exe",
		arm64: "@biomejs/cli-win32-arm64/biome.exe",
	},
	darwin: {
		x64: "@biomejs/cli-darwin-x64/biome",
		arm64: "@biomejs/cli-darwin-arm64/biome",
	},
	linux: {
		x64: "@biomejs/cli-linux-x64/biome",
		arm64: "@biomejs/cli-linux-arm64/biome",
	},
	"linux-musl": {
		x64: "@biomejs/cli-linux-x64-musl/biome",
		arm64: "@biomejs/cli-linux-arm64-musl/biome",
	},
};

const binName =
	platform === "linux" && isMusl()
		? PLATFORMS?.["linux-musl"]?.[arch]
		: PLATFORMS?.[platform]?.[arch];

if (binName) {
	let binPath;
	try {
		binPath = require.resolve(binName);
	} catch {
		console.warn(
			`The Biome CLI postinstall script failed to resolve the binary file "${binName}". Running Biome from the npm package will probably not work correctly.`,
		);
	}
} else {
	console.warn(
		"The Biome CLI package doesn't ship with prebuilt binaries for your platform yet. " +
			"You can still use the CLI by cloning the biomejs/biome repo from GitHub, " +
			"and follow the instructions there to build the CLI for your platform.",
	);
}
