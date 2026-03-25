import escapeClassName from './escapeClassName'
import escapeCommas from './escapeCommas'

export function asClass(name) {
  return escapeCommas(`.${escapeClassName(name)}`)
}

export default function nameClass(classPrefix, key) {
  return asClass(formatClass(classPrefix, key))
}

export function formatClass(classPrefix, key) {
  if (key === 'DEFAULT') {
    return classPrefix
  }

  if (key === '-' || key === '-DEFAULT') {
    return `-${classPrefix}`
  }

  if (key.startsWith('-')) {
    return `-${classPrefix}${key}`
  }

  if (key.startsWith('/')) {
    return `${classPrefix}${key}`
  }

  return `${classPrefix}-${key}`
}
