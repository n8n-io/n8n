const path = require('path')
const childProcess = require('child_process')
const { logger } = require('../../shared/logger')

function installCommandForOps () {
  return 'curl -sfS https://dotenvx.sh/ops | sh'
}

function opsBanner (installCommand) {
  const lines = [
    '',
    '   ██████╗ ██████╗ ███████╗',
    '  ██╔═══██╗██╔══██╗██╔════╝',
    '  ██║   ██║██████╔╝███████╗',
    '  ██║   ██║██╔═══╝ ╚════██║  [www.dotenvx.com/ops]',
    '  ╚██████╔╝██║     ███████║',
    '   ╚═════╝ ╚═╝     ╚══════╝',
    '',
    '  ⛨  ARMORED KEYS: Harden your private keys.',
    `  ⮕  install [${installCommand}]`,
    '  ⮕  and then run [dotenvx-ops login]'
  ]

  const innerWidth = Math.max(67, ...lines.map((line) => line.length))
  const top = ` ${'_'.repeat(innerWidth)}`
  const middle = lines.map((line) => `|${line.padEnd(innerWidth)}|`).join('\n')
  const bottom = `|${'_'.repeat(innerWidth)}|`

  return `${top}\n${middle}\n${bottom}`
}

function executeDynamic (program, command, rawArgs) {
  if (!command) {
    program.outputHelp()
    process.exit(1)
    return
  }

  // construct the full command line manually including flags
  const commandIndex = rawArgs.indexOf(command)
  const forwardedArgs = rawArgs.slice(commandIndex + 1)

  logger.debug(`command: ${command}`)
  logger.debug(`args: ${JSON.stringify(forwardedArgs)}`)

  const binPath = path.join(process.cwd(), 'node_modules', '.bin')
  const newPath = `${binPath}:${process.env.PATH}`
  const env = { ...process.env, PATH: newPath }

  const result = childProcess.spawnSync(`dotenvx-${command}`, forwardedArgs, { stdio: 'inherit', env })
  if (result.error) {
    if (command === 'ops') {
      const installCommand = installCommandForOps()
      console.log(opsBanner(installCommand))
    } else {
      logger.info(`error: unknown command '${command}'`)
    }
  }

  if (result.status !== 0) {
    process.exit(result.status)
  }
}

module.exports = executeDynamic
