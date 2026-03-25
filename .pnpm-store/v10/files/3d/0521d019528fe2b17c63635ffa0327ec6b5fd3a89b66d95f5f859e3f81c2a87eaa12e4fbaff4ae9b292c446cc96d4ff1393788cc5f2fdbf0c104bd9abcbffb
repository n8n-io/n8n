import { normalizeScreens } from '../util/normalizeScreens'
import buildMediaQuery from '../util/buildMediaQuery'

export default function ({ tailwindConfig: { theme } }) {
  return function (css) {
    css.walkAtRules('screen', (atRule) => {
      let screen = atRule.params
      let screens = normalizeScreens(theme.screens)
      let screenDefinition = screens.find(({ name }) => name === screen)

      if (!screenDefinition) {
        throw atRule.error(`No \`${screen}\` screen found.`)
      }

      atRule.name = 'media'
      atRule.params = buildMediaQuery(screenDefinition)
    })
  }
}
