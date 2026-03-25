const { JS_EXT_TO_TREAT_AS_ESM, TS_EXT_TO_TREAT_AS_ESM } = require('../dist/constants')
const { createJestPreset } = require('../dist/presets/create-jest-preset')

module.exports = {
  get defaults() {
    return createJestPreset()
  },
  get defaultsLegacy() {
    return createJestPreset(true, false)
  },
  get defaultsESM() {
    return createJestPreset(false, false, { extensionsToTreatAsEsm: TS_EXT_TO_TREAT_AS_ESM })
  },
  get defaultsESMLegacy() {
    return createJestPreset(true, false, { extensionsToTreatAsEsm: TS_EXT_TO_TREAT_AS_ESM })
  },
  get jsWithTs() {
    return createJestPreset(false, true)
  },
  get jsWithTsLegacy() {
    return createJestPreset(true, true)
  },
  get jsWithTsESM() {
    return createJestPreset(false, true, {
      extensionsToTreatAsEsm: [...JS_EXT_TO_TREAT_AS_ESM, ...TS_EXT_TO_TREAT_AS_ESM],
    })
  },
  get jsWithTsESMLegacy() {
    return createJestPreset(true, true, {
      extensionsToTreatAsEsm: [...JS_EXT_TO_TREAT_AS_ESM, ...TS_EXT_TO_TREAT_AS_ESM],
    })
  },
  get jsWithBabel() {
    return createJestPreset(false, false, {
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
      },
    })
  },
  get jsWithBabelLegacy() {
    return createJestPreset(true, false, {
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
      },
    })
  },
  get jsWithBabelESM() {
    return createJestPreset(false, false, {
      extensionsToTreatAsEsm: [...JS_EXT_TO_TREAT_AS_ESM, ...TS_EXT_TO_TREAT_AS_ESM],
      transform: {
        '^.+\\.m?[j]sx?$': 'babel-jest',
      },
    })
  },
  get jsWithBabelESMLegacy() {
    return createJestPreset(true, false, {
      extensionsToTreatAsEsm: [...JS_EXT_TO_TREAT_AS_ESM, ...TS_EXT_TO_TREAT_AS_ESM],
      transform: {
        '^.+\\.m?[j]sx?$': 'babel-jest',
      },
    })
  },
}
