/* eslint-disable object-property-newline */
'use strict'

const decodeText = require('./decodeText')

const RE_ENCODED = /%[a-fA-F0-9][a-fA-F0-9]/g

const EncodedLookup = {
  '%00': '\x00', '%01': '\x01', '%02': '\x02', '%03': '\x03', '%04': '\x04',
  '%05': '\x05', '%06': '\x06', '%07': '\x07', '%08': '\x08', '%09': '\x09',
  '%0a': '\x0a', '%0A': '\x0a', '%0b': '\x0b', '%0B': '\x0b', '%0c': '\x0c',
  '%0C': '\x0c', '%0d': '\x0d', '%0D': '\x0d', '%0e': '\x0e', '%0E': '\x0e',
  '%0f': '\x0f', '%0F': '\x0f', '%10': '\x10', '%11': '\x11', '%12': '\x12',
  '%13': '\x13', '%14': '\x14', '%15': '\x15', '%16': '\x16', '%17': '\x17',
  '%18': '\x18', '%19': '\x19', '%1a': '\x1a', '%1A': '\x1a', '%1b': '\x1b',
  '%1B': '\x1b', '%1c': '\x1c', '%1C': '\x1c', '%1d': '\x1d', '%1D': '\x1d',
  '%1e': '\x1e', '%1E': '\x1e', '%1f': '\x1f', '%1F': '\x1f', '%20': '\x20',
  '%21': '\x21', '%22': '\x22', '%23': '\x23', '%24': '\x24', '%25': '\x25',
  '%26': '\x26', '%27': '\x27', '%28': '\x28', '%29': '\x29', '%2a': '\x2a',
  '%2A': '\x2a', '%2b': '\x2b', '%2B': '\x2b', '%2c': '\x2c', '%2C': '\x2c',
  '%2d': '\x2d', '%2D': '\x2d', '%2e': '\x2e', '%2E': '\x2e', '%2f': '\x2f',
  '%2F': '\x2f', '%30': '\x30', '%31': '\x31', '%32': '\x32', '%33': '\x33',
  '%34': '\x34', '%35': '\x35', '%36': '\x36', '%37': '\x37', '%38': '\x38',
  '%39': '\x39', '%3a': '\x3a', '%3A': '\x3a', '%3b': '\x3b', '%3B': '\x3b',
  '%3c': '\x3c', '%3C': '\x3c', '%3d': '\x3d', '%3D': '\x3d', '%3e': '\x3e',
  '%3E': '\x3e', '%3f': '\x3f', '%3F': '\x3f', '%40': '\x40', '%41': '\x41',
  '%42': '\x42', '%43': '\x43', '%44': '\x44', '%45': '\x45', '%46': '\x46',
  '%47': '\x47', '%48': '\x48', '%49': '\x49', '%4a': '\x4a', '%4A': '\x4a',
  '%4b': '\x4b', '%4B': '\x4b', '%4c': '\x4c', '%4C': '\x4c', '%4d': '\x4d',
  '%4D': '\x4d', '%4e': '\x4e', '%4E': '\x4e', '%4f': '\x4f', '%4F': '\x4f',
  '%50': '\x50', '%51': '\x51', '%52': '\x52', '%53': '\x53', '%54': '\x54',
  '%55': '\x55', '%56': '\x56', '%57': '\x57', '%58': '\x58', '%59': '\x59',
  '%5a': '\x5a', '%5A': '\x5a', '%5b': '\x5b', '%5B': '\x5b', '%5c': '\x5c',
  '%5C': '\x5c', '%5d': '\x5d', '%5D': '\x5d', '%5e': '\x5e', '%5E': '\x5e',
  '%5f': '\x5f', '%5F': '\x5f', '%60': '\x60', '%61': '\x61', '%62': '\x62',
  '%63': '\x63', '%64': '\x64', '%65': '\x65', '%66': '\x66', '%67': '\x67',
  '%68': '\x68', '%69': '\x69', '%6a': '\x6a', '%6A': '\x6a', '%6b': '\x6b',
  '%6B': '\x6b', '%6c': '\x6c', '%6C': '\x6c', '%6d': '\x6d', '%6D': '\x6d',
  '%6e': '\x6e', '%6E': '\x6e', '%6f': '\x6f', '%6F': '\x6f', '%70': '\x70',
  '%71': '\x71', '%72': '\x72', '%73': '\x73', '%74': '\x74', '%75': '\x75',
  '%76': '\x76', '%77': '\x77', '%78': '\x78', '%79': '\x79', '%7a': '\x7a',
  '%7A': '\x7a', '%7b': '\x7b', '%7B': '\x7b', '%7c': '\x7c', '%7C': '\x7c',
  '%7d': '\x7d', '%7D': '\x7d', '%7e': '\x7e', '%7E': '\x7e', '%7f': '\x7f',
  '%7F': '\x7f', '%80': '\x80', '%81': '\x81', '%82': '\x82', '%83': '\x83',
  '%84': '\x84', '%85': '\x85', '%86': '\x86', '%87': '\x87', '%88': '\x88',
  '%89': '\x89', '%8a': '\x8a', '%8A': '\x8a', '%8b': '\x8b', '%8B': '\x8b',
  '%8c': '\x8c', '%8C': '\x8c', '%8d': '\x8d', '%8D': '\x8d', '%8e': '\x8e',
  '%8E': '\x8e', '%8f': '\x8f', '%8F': '\x8f', '%90': '\x90', '%91': '\x91',
  '%92': '\x92', '%93': '\x93', '%94': '\x94', '%95': '\x95', '%96': '\x96',
  '%97': '\x97', '%98': '\x98', '%99': '\x99', '%9a': '\x9a', '%9A': '\x9a',
  '%9b': '\x9b', '%9B': '\x9b', '%9c': '\x9c', '%9C': '\x9c', '%9d': '\x9d',
  '%9D': '\x9d', '%9e': '\x9e', '%9E': '\x9e', '%9f': '\x9f', '%9F': '\x9f',
  '%a0': '\xa0', '%A0': '\xa0', '%a1': '\xa1', '%A1': '\xa1', '%a2': '\xa2',
  '%A2': '\xa2', '%a3': '\xa3', '%A3': '\xa3', '%a4': '\xa4', '%A4': '\xa4',
  '%a5': '\xa5', '%A5': '\xa5', '%a6': '\xa6', '%A6': '\xa6', '%a7': '\xa7',
  '%A7': '\xa7', '%a8': '\xa8', '%A8': '\xa8', '%a9': '\xa9', '%A9': '\xa9',
  '%aa': '\xaa', '%Aa': '\xaa', '%aA': '\xaa', '%AA': '\xaa', '%ab': '\xab',
  '%Ab': '\xab', '%aB': '\xab', '%AB': '\xab', '%ac': '\xac', '%Ac': '\xac',
  '%aC': '\xac', '%AC': '\xac', '%ad': '\xad', '%Ad': '\xad', '%aD': '\xad',
  '%AD': '\xad', '%ae': '\xae', '%Ae': '\xae', '%aE': '\xae', '%AE': '\xae',
  '%af': '\xaf', '%Af': '\xaf', '%aF': '\xaf', '%AF': '\xaf', '%b0': '\xb0',
  '%B0': '\xb0', '%b1': '\xb1', '%B1': '\xb1', '%b2': '\xb2', '%B2': '\xb2',
  '%b3': '\xb3', '%B3': '\xb3', '%b4': '\xb4', '%B4': '\xb4', '%b5': '\xb5',
  '%B5': '\xb5', '%b6': '\xb6', '%B6': '\xb6', '%b7': '\xb7', '%B7': '\xb7',
  '%b8': '\xb8', '%B8': '\xb8', '%b9': '\xb9', '%B9': '\xb9', '%ba': '\xba',
  '%Ba': '\xba', '%bA': '\xba', '%BA': '\xba', '%bb': '\xbb', '%Bb': '\xbb',
  '%bB': '\xbb', '%BB': '\xbb', '%bc': '\xbc', '%Bc': '\xbc', '%bC': '\xbc',
  '%BC': '\xbc', '%bd': '\xbd', '%Bd': '\xbd', '%bD': '\xbd', '%BD': '\xbd',
  '%be': '\xbe', '%Be': '\xbe', '%bE': '\xbe', '%BE': '\xbe', '%bf': '\xbf',
  '%Bf': '\xbf', '%bF': '\xbf', '%BF': '\xbf', '%c0': '\xc0', '%C0': '\xc0',
  '%c1': '\xc1', '%C1': '\xc1', '%c2': '\xc2', '%C2': '\xc2', '%c3': '\xc3',
  '%C3': '\xc3', '%c4': '\xc4', '%C4': '\xc4', '%c5': '\xc5', '%C5': '\xc5',
  '%c6': '\xc6', '%C6': '\xc6', '%c7': '\xc7', '%C7': '\xc7', '%c8': '\xc8',
  '%C8': '\xc8', '%c9': '\xc9', '%C9': '\xc9', '%ca': '\xca', '%Ca': '\xca',
  '%cA': '\xca', '%CA': '\xca', '%cb': '\xcb', '%Cb': '\xcb', '%cB': '\xcb',
  '%CB': '\xcb', '%cc': '\xcc', '%Cc': '\xcc', '%cC': '\xcc', '%CC': '\xcc',
  '%cd': '\xcd', '%Cd': '\xcd', '%cD': '\xcd', '%CD': '\xcd', '%ce': '\xce',
  '%Ce': '\xce', '%cE': '\xce', '%CE': '\xce', '%cf': '\xcf', '%Cf': '\xcf',
  '%cF': '\xcf', '%CF': '\xcf', '%d0': '\xd0', '%D0': '\xd0', '%d1': '\xd1',
  '%D1': '\xd1', '%d2': '\xd2', '%D2': '\xd2', '%d3': '\xd3', '%D3': '\xd3',
  '%d4': '\xd4', '%D4': '\xd4', '%d5': '\xd5', '%D5': '\xd5', '%d6': '\xd6',
  '%D6': '\xd6', '%d7': '\xd7', '%D7': '\xd7', '%d8': '\xd8', '%D8': '\xd8',
  '%d9': '\xd9', '%D9': '\xd9', '%da': '\xda', '%Da': '\xda', '%dA': '\xda',
  '%DA': '\xda', '%db': '\xdb', '%Db': '\xdb', '%dB': '\xdb', '%DB': '\xdb',
  '%dc': '\xdc', '%Dc': '\xdc', '%dC': '\xdc', '%DC': '\xdc', '%dd': '\xdd',
  '%Dd': '\xdd', '%dD': '\xdd', '%DD': '\xdd', '%de': '\xde', '%De': '\xde',
  '%dE': '\xde', '%DE': '\xde', '%df': '\xdf', '%Df': '\xdf', '%dF': '\xdf',
  '%DF': '\xdf', '%e0': '\xe0', '%E0': '\xe0', '%e1': '\xe1', '%E1': '\xe1',
  '%e2': '\xe2', '%E2': '\xe2', '%e3': '\xe3', '%E3': '\xe3', '%e4': '\xe4',
  '%E4': '\xe4', '%e5': '\xe5', '%E5': '\xe5', '%e6': '\xe6', '%E6': '\xe6',
  '%e7': '\xe7', '%E7': '\xe7', '%e8': '\xe8', '%E8': '\xe8', '%e9': '\xe9',
  '%E9': '\xe9', '%ea': '\xea', '%Ea': '\xea', '%eA': '\xea', '%EA': '\xea',
  '%eb': '\xeb', '%Eb': '\xeb', '%eB': '\xeb', '%EB': '\xeb', '%ec': '\xec',
  '%Ec': '\xec', '%eC': '\xec', '%EC': '\xec', '%ed': '\xed', '%Ed': '\xed',
  '%eD': '\xed', '%ED': '\xed', '%ee': '\xee', '%Ee': '\xee', '%eE': '\xee',
  '%EE': '\xee', '%ef': '\xef', '%Ef': '\xef', '%eF': '\xef', '%EF': '\xef',
  '%f0': '\xf0', '%F0': '\xf0', '%f1': '\xf1', '%F1': '\xf1', '%f2': '\xf2',
  '%F2': '\xf2', '%f3': '\xf3', '%F3': '\xf3', '%f4': '\xf4', '%F4': '\xf4',
  '%f5': '\xf5', '%F5': '\xf5', '%f6': '\xf6', '%F6': '\xf6', '%f7': '\xf7',
  '%F7': '\xf7', '%f8': '\xf8', '%F8': '\xf8', '%f9': '\xf9', '%F9': '\xf9',
  '%fa': '\xfa', '%Fa': '\xfa', '%fA': '\xfa', '%FA': '\xfa', '%fb': '\xfb',
  '%Fb': '\xfb', '%fB': '\xfb', '%FB': '\xfb', '%fc': '\xfc', '%Fc': '\xfc',
  '%fC': '\xfc', '%FC': '\xfc', '%fd': '\xfd', '%Fd': '\xfd', '%fD': '\xfd',
  '%FD': '\xfd', '%fe': '\xfe', '%Fe': '\xfe', '%fE': '\xfe', '%FE': '\xfe',
  '%ff': '\xff', '%Ff': '\xff', '%fF': '\xff', '%FF': '\xff'
}

function encodedReplacer (match) {
  return EncodedLookup[match]
}

const STATE_KEY = 0
const STATE_VALUE = 1
const STATE_CHARSET = 2
const STATE_LANG = 3

function parseParams (str) {
  const res = []
  let state = STATE_KEY
  let charset = ''
  let inquote = false
  let escaping = false
  let p = 0
  let tmp = ''
  const len = str.length

  for (var i = 0; i < len; ++i) { // eslint-disable-line no-var
    const char = str[i]
    if (char === '\\' && inquote) {
      if (escaping) { escaping = false } else {
        escaping = true
        continue
      }
    } else if (char === '"') {
      if (!escaping) {
        if (inquote) {
          inquote = false
          state = STATE_KEY
        } else { inquote = true }
        continue
      } else { escaping = false }
    } else {
      if (escaping && inquote) { tmp += '\\' }
      escaping = false
      if ((state === STATE_CHARSET || state === STATE_LANG) && char === "'") {
        if (state === STATE_CHARSET) {
          state = STATE_LANG
          charset = tmp.substring(1)
        } else { state = STATE_VALUE }
        tmp = ''
        continue
      } else if (state === STATE_KEY &&
        (char === '*' || char === '=') &&
        res.length) {
        state = char === '*'
          ? STATE_CHARSET
          : STATE_VALUE
        res[p] = [tmp, undefined]
        tmp = ''
        continue
      } else if (!inquote && char === ';') {
        state = STATE_KEY
        if (charset) {
          if (tmp.length) {
            tmp = decodeText(tmp.replace(RE_ENCODED, encodedReplacer),
              'binary',
              charset)
          }
          charset = ''
        } else if (tmp.length) {
          tmp = decodeText(tmp, 'binary', 'utf8')
        }
        if (res[p] === undefined) { res[p] = tmp } else { res[p][1] = tmp }
        tmp = ''
        ++p
        continue
      } else if (!inquote && (char === ' ' || char === '\t')) { continue }
    }
    tmp += char
  }
  if (charset && tmp.length) {
    tmp = decodeText(tmp.replace(RE_ENCODED, encodedReplacer),
      'binary',
      charset)
  } else if (tmp) {
    tmp = decodeText(tmp, 'binary', 'utf8')
  }

  if (res[p] === undefined) {
    if (tmp) { res[p] = tmp }
  } else { res[p][1] = tmp }

  return res
}

module.exports = parseParams
