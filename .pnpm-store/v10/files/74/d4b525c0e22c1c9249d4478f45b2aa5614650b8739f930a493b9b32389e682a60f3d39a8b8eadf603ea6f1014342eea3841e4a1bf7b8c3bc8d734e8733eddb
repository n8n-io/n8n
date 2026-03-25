const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { version } = require('unrs-resolver/package.json')

if (process.versions.webcontainer) {
  const baseDir = path.resolve(os.tmpdir(), `unrs-resolver-${version}`)

  const bindingPkgName = '@unrs/resolver-binding-wasm32-wasi'

  const bindingEntry = path.resolve(
    baseDir,
    `node_modules/${bindingPkgName}/resolver.wasi.cjs`,
  )

  if (!fs.existsSync(bindingEntry)) {
    fs.rmSync(baseDir, { recursive: true, force: true })
    fs.mkdirSync(baseDir, { recursive: true })

    const bindingPkg = `${bindingPkgName}@${version}`

    console.log(
      `[unrs-resolver] Downloading \`${bindingPkg}\` on WebContainer...`,
    )

    execFileSync('pnpm', ['i', bindingPkg], {
      cwd: baseDir,
      stdio: 'inherit',
    })
  }

  module.exports = require(bindingEntry)

  return
}

const userAgent =
  (process.env.npm_config_user_agent || '').split('/')[0] || 'npm'

const EXECUTORS = {
  npm: 'npx',
  pnpm: 'pnpm',
  yarn: 'yarn',
  bun: 'bun',
  deno: (args) => ['deno', 'run', `npm:${args[0]}`, ...args.slice(1)],
}

const executor = EXECUTORS[userAgent]

if (!executor) {
  console.error(
    `Unsupported package manager: ${userAgent}. Supported managers are: ${Object.keys(
      EXECUTORS,
    ).join(', ')}.`,
  )
  process.exitCode = 1
  return
}

function constructCommand(value, args) {
  const list =
    typeof value === 'function' ? value(args) : [].concat(value, args)
  return {
    command: list[0],
    args: list.slice(1),
  }
}

const { command, args } = constructCommand(executor, [
  'napi-postinstall',
  'unrs-resolver',
  version,
  'check',
])

execFileSync(command, args, {
  cwd: __dirname,
  stdio: 'inherit',
})

process.env.SKIP_UNRS_RESOLVER_FALLBACK = '1'

const UNRS_RESOLVER_PATH = require.resolve('unrs-resolver')

delete require.cache[UNRS_RESOLVER_PATH]

module.exports = require('unrs-resolver')
