import colors from 'picocolors'

let alreadyShown = new Set()

function log(type, messages, key) {
  if (typeof process !== 'undefined' && process.env.JEST_WORKER_ID) return

  if (key && alreadyShown.has(key)) return
  if (key) alreadyShown.add(key)

  console.warn('')
  messages.forEach((message) => console.warn(type, '-', message))
}

export function dim(input) {
  return colors.dim(input)
}

export default {
  info(key, messages) {
    log(colors.bold(colors.cyan('info')), ...(Array.isArray(key) ? [key] : [messages, key]))
  },
  warn(key, messages) {
    log(colors.bold(colors.yellow('warn')), ...(Array.isArray(key) ? [key] : [messages, key]))
  },
  risk(key, messages) {
    log(colors.bold(colors.magenta('risk')), ...(Array.isArray(key) ? [key] : [messages, key]))
  },
}
