import * as tty from "tty"

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

export const options = Object.defineProperty({}, "enabled", {
  get: () => enabled,
  set: (value) => (enabled = value),
})

export const reset = init(0, 0)
export const bold = raw("\x1b[1m", "\x1b[22m", /\x1b\[22m/g, "\x1b[22m\x1b[1m")
export const dim = raw("\x1b[2m", "\x1b[22m", /\x1b\[22m/g, "\x1b[22m\x1b[2m")
export const italic = init(3, 23)
export const underline = init(4, 24)
export const inverse = init(7, 27)
export const hidden = init(8, 28)
export const strikethrough = init(9, 29)
export const black = init(30, 39)
export const red = init(31, 39)
export const green = init(32, 39)
export const yellow = init(33, 39)
export const blue = init(34, 39)
export const magenta = init(35, 39)
export const cyan = init(36, 39)
export const white = init(37, 39)
export const gray = init(90, 39)
export const bgBlack = init(40, 49)
export const bgRed = init(41, 49)
export const bgGreen = init(42, 49)
export const bgYellow = init(43, 49)
export const bgBlue = init(44, 49)
export const bgMagenta = init(45, 49)
export const bgCyan = init(46, 49)
export const bgWhite = init(47, 49)
export const blackBright = init(90, 39)
export const redBright = init(91, 39)
export const greenBright = init(92, 39)
export const yellowBright = init(93, 39)
export const blueBright = init(94, 39)
export const magentaBright = init(95, 39)
export const cyanBright = init(96, 39)
export const whiteBright = init(97, 39)
export const bgBlackBright = init(100, 49)
export const bgRedBright = init(101, 49)
export const bgGreenBright = init(102, 49)
export const bgYellowBright = init(103, 49)
export const bgBlueBright = init(104, 49)
export const bgMagentaBright = init(105, 49)
export const bgCyanBright = init(106, 49)
export const bgWhiteBright = init(107, 49)
