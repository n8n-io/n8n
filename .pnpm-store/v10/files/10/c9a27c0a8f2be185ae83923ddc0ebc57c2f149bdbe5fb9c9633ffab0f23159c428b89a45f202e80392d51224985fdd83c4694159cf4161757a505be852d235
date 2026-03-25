const tty = require("tty")

const env = process.env

const isDisabled = "NO_COLOR" in env
const isForced = "FORCE_COLOR" in env
const isWindows = process.platform === "win32"

const isCompatibleTerminal =
  tty && tty.isatty(1) && env.TERM && env.TERM !== "dumb"

const isCI =
  "CI" in env &&
  ("GITHUB_ACTIONS" in env || "GITLAB_CI" in env || "CIRCLECI" in env)

let enabled =
  !isDisabled && (isForced || isWindows || isCompatibleTerminal || isCI)

const raw = (open, close, searchRegex, replaceValue) => (s) =>
  enabled
    ? open +
      (~(s += "").indexOf(close, 4) // skip opening \x1b[
        ? s.replace(searchRegex, replaceValue)
        : s) +
      close
    : s

const init = (open, close) => {
  return raw(
    `\x1b[${open}m`,
    `\x1b[${close}m`,
    new RegExp(`\\x1b\\[${close}m`, "g"),
    `\x1b[${open}m`
  )
}

exports.options = Object.defineProperty({}, "enabled", {
  get: () => enabled,
  set: (value) => (enabled = value),
})

exports.reset = init(0, 0)
exports.bold = raw("\x1b[1m", "\x1b[22m", /\x1b\[22m/g, "\x1b[22m\x1b[1m")
exports.dim = raw("\x1b[2m", "\x1b[22m", /\x1b\[22m/g, "\x1b[22m\x1b[2m")
exports.italic = init(3, 23)
exports.underline = init(4, 24)
exports.inverse = init(7, 27)
exports.hidden = init(8, 28)
exports.strikethrough = init(9, 29)
exports.black = init(30, 39)
exports.red = init(31, 39)
exports.green = init(32, 39)
exports.yellow = init(33, 39)
exports.blue = init(34, 39)
exports.magenta = init(35, 39)
exports.cyan = init(36, 39)
exports.white = init(37, 39)
exports.gray = init(90, 39)
exports.bgBlack = init(40, 49)
exports.bgRed = init(41, 49)
exports.bgGreen = init(42, 49)
exports.bgYellow = init(43, 49)
exports.bgBlue = init(44, 49)
exports.bgMagenta = init(45, 49)
exports.bgCyan = init(46, 49)
exports.bgWhite = init(47, 49)
exports.blackBright = init(90, 39)
exports.redBright = init(91, 39)
exports.greenBright = init(92, 39)
exports.yellowBright = init(93, 39)
exports.blueBright = init(94, 39)
exports.magentaBright = init(95, 39)
exports.cyanBright = init(96, 39)
exports.whiteBright = init(97, 39)
exports.bgBlackBright = init(100, 49)
exports.bgRedBright = init(101, 49)
exports.bgGreenBright = init(102, 49)
exports.bgYellowBright = init(103, 49)
exports.bgBlueBright = init(104, 49)
exports.bgMagentaBright = init(105, 49)
exports.bgCyanBright = init(106, 49)
exports.bgWhiteBright = init(107, 49)
