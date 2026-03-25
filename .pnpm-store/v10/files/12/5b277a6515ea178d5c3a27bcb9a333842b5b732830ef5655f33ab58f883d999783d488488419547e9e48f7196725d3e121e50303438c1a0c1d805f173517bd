import log from '../util/log'

export default function normalizeTailwindDirectives(root) {
  let tailwindDirectives = new Set()
  let layerDirectives = new Set()
  let applyDirectives = new Set()

  root.walkAtRules((atRule) => {
    if (atRule.name === 'apply') {
      applyDirectives.add(atRule)
    }

    if (atRule.name === 'import') {
      if (atRule.params === '"tailwindcss/base"' || atRule.params === "'tailwindcss/base'") {
        atRule.name = 'tailwind'
        atRule.params = 'base'
      } else if (
        atRule.params === '"tailwindcss/components"' ||
        atRule.params === "'tailwindcss/components'"
      ) {
        atRule.name = 'tailwind'
        atRule.params = 'components'
      } else if (
        atRule.params === '"tailwindcss/utilities"' ||
        atRule.params === "'tailwindcss/utilities'"
      ) {
        atRule.name = 'tailwind'
        atRule.params = 'utilities'
      } else if (
        atRule.params === '"tailwindcss/screens"' ||
        atRule.params === "'tailwindcss/screens'" ||
        atRule.params === '"tailwindcss/variants"' ||
        atRule.params === "'tailwindcss/variants'"
      ) {
        atRule.name = 'tailwind'
        atRule.params = 'variants'
      }
    }

    if (atRule.name === 'tailwind') {
      if (atRule.params === 'screens') {
        atRule.params = 'variants'
      }
      tailwindDirectives.add(atRule.params)
    }

    if (['layer', 'responsive', 'variants'].includes(atRule.name)) {
      if (['responsive', 'variants'].includes(atRule.name)) {
        log.warn(`${atRule.name}-at-rule-deprecated`, [
          `The \`@${atRule.name}\` directive has been deprecated in Tailwind CSS v3.0.`,
          `Use \`@layer utilities\` or \`@layer components\` instead.`,
          'https://tailwindcss.com/docs/upgrade-guide#replace-variants-with-layer',
        ])
      }
      layerDirectives.add(atRule)
    }
  })

  if (
    !tailwindDirectives.has('base') ||
    !tailwindDirectives.has('components') ||
    !tailwindDirectives.has('utilities')
  ) {
    for (let rule of layerDirectives) {
      if (rule.name === 'layer' && ['base', 'components', 'utilities'].includes(rule.params)) {
        if (!tailwindDirectives.has(rule.params)) {
          throw rule.error(
            `\`@layer ${rule.params}\` is used but no matching \`@tailwind ${rule.params}\` directive is present.`
          )
        }
      } else if (rule.name === 'responsive') {
        if (!tailwindDirectives.has('utilities')) {
          throw rule.error('`@responsive` is used but `@tailwind utilities` is missing.')
        }
      } else if (rule.name === 'variants') {
        if (!tailwindDirectives.has('utilities')) {
          throw rule.error('`@variants` is used but `@tailwind utilities` is missing.')
        }
      }
    }
  }

  return { tailwindDirectives, applyDirectives }
}
