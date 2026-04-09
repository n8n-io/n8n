function npmRun(agent) {
  return (args) => {
    if (args.length > 1) {
      return [agent, "run", args[0], "--", ...args.slice(1)];
    } else {
      return [agent, "run", args[0]];
    }
  };
}
function denoExecute() {
  return (args) => {
    return ["deno", "run", `npm:${args[0]}`, ...args.slice(1)];
  };
}
const npm = {
  "agent": ["npm", 0],
  "run": npmRun("npm"),
  "install": ["npm", "i", 0],
  "frozen": ["npm", "ci", 0],
  "global": ["npm", "i", "-g", 0],
  "add": ["npm", "i", 0],
  "upgrade": ["npm", "update", 0],
  "upgrade-interactive": null,
  "execute": ["npx", 0],
  "execute-local": ["npx", 0],
  "uninstall": ["npm", "uninstall", 0],
  "global_uninstall": ["npm", "uninstall", "-g", 0]
};
const yarn = {
  "agent": ["yarn", 0],
  "run": ["yarn", "run", 0],
  "install": ["yarn", "install", 0],
  "frozen": ["yarn", "install", "--frozen-lockfile", 0],
  "global": ["yarn", "global", "add", 0],
  "add": ["yarn", "add", 0],
  "upgrade": ["yarn", "upgrade", 0],
  "upgrade-interactive": ["yarn", "upgrade-interactive", 0],
  "execute": ["npx", 0],
  "execute-local": ["yarn", "exec", 0],
  "uninstall": ["yarn", "remove", 0],
  "global_uninstall": ["yarn", "global", "remove", 0]
};
const yarnBerry = {
  ...yarn,
  "frozen": ["yarn", "install", "--immutable", 0],
  "upgrade": ["yarn", "up", 0],
  "upgrade-interactive": ["yarn", "up", "-i", 0],
  "execute": ["yarn", "dlx", 0],
  "execute-local": ["yarn", "exec", 0],
  // Yarn 2+ removed 'global', see https://github.com/yarnpkg/berry/issues/821
  "global": ["npm", "i", "-g", 0],
  "global_uninstall": ["npm", "uninstall", "-g", 0]
};
const pnpm = {
  "agent": ["pnpm", 0],
  "run": ["pnpm", "run", 0],
  "install": ["pnpm", "i", 0],
  "frozen": ["pnpm", "i", "--frozen-lockfile", 0],
  "global": ["pnpm", "add", "-g", 0],
  "add": ["pnpm", "add", 0],
  "upgrade": ["pnpm", "update", 0],
  "upgrade-interactive": ["pnpm", "update", "-i", 0],
  "execute": ["pnpm", "dlx", 0],
  "execute-local": ["pnpm", "exec", 0],
  "uninstall": ["pnpm", "remove", 0],
  "global_uninstall": ["pnpm", "remove", "--global", 0]
};
const bun = {
  "agent": ["bun", 0],
  "run": ["bun", "run", 0],
  "install": ["bun", "install", 0],
  "frozen": ["bun", "install", "--frozen-lockfile", 0],
  "global": ["bun", "add", "-g", 0],
  "add": ["bun", "add", 0],
  "upgrade": ["bun", "update", 0],
  "upgrade-interactive": ["bun", "update", 0],
  "execute": ["bun", "x", 0],
  "execute-local": ["bun", "x", 0],
  "uninstall": ["bun", "remove", 0],
  "global_uninstall": ["bun", "remove", "-g", 0]
};
const deno = {
  "agent": ["deno", 0],
  "run": ["deno", "task", 0],
  "install": ["deno", "install", 0],
  "frozen": ["deno", "install", "--frozen", 0],
  "global": ["deno", "install", "-g", 0],
  "add": ["deno", "add", 0],
  "upgrade": ["deno", "outdated", "--update", 0],
  "upgrade-interactive": ["deno", "outdated", "--update", 0],
  "execute": denoExecute(),
  "execute-local": ["deno", "task", "--eval", 0],
  "uninstall": ["deno", "remove", 0],
  "global_uninstall": ["deno", "uninstall", "-g", 0]
};
const COMMANDS = {
  "npm": npm,
  "yarn": yarn,
  "yarn@berry": yarnBerry,
  "pnpm": pnpm,
  // pnpm v6.x or below
  "pnpm@6": {
    ...pnpm,
    run: npmRun("pnpm")
  },
  "bun": bun,
  "deno": deno
};
function resolveCommand(agent, command, args) {
  const value = COMMANDS[agent][command];
  return constructCommand(value, args);
}
function constructCommand(value, args) {
  if (value == null)
    return null;
  const list = typeof value === "function" ? value(args) : value.flatMap((v) => {
    if (typeof v === "number")
      return args;
    return [v];
  });
  return {
    command: list[0],
    args: list.slice(1)
  };
}

export { COMMANDS, constructCommand, resolveCommand };
