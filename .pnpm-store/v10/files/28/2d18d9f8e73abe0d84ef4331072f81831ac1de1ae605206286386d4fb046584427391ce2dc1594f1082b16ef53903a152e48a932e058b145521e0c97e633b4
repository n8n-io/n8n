// @flow
import statefulSelectors from '../internalHelpers/_statefulSelectors'

import type { InteractionState } from '../types/interactionState'

const stateMap = [undefined, null, 'active', 'focus', 'hover']

function template(state: string): string {
  return `input[type="color"]${state},
    input[type="date"]${state},
    input[type="datetime"]${state},
    input[type="datetime-local"]${state},
    input[type="email"]${state},
    input[type="month"]${state},
    input[type="number"]${state},
    input[type="password"]${state},
    input[type="search"]${state},
    input[type="tel"]${state},
    input[type="text"]${state},
    input[type="time"]${state},
    input[type="url"]${state},
    input[type="week"]${state},
    input:not([type])${state},
    textarea${state}`
}

/**
 * Populates selectors that target all text inputs. You can pass optional states to append to the selectors.
 * @example
 * // Styles as object usage
 * const styles = {
 *   [textInputs('active')]: {
 *     'border': 'none'
 *   }
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   > ${textInputs('active')} {
 *     border: none;
 *   }
 * `
 *
 * // CSS in JS Output
 *
 *  'input[type="color"]:active,
 *  input[type="date"]:active,
 *  input[type="datetime"]:active,
 *  input[type="datetime-local"]:active,
 *  input[type="email"]:active,
 *  input[type="month"]:active,
 *  input[type="number"]:active,
 *  input[type="password"]:active,
 *  input[type="search"]:active,
 *  input[type="tel"]:active,
 *  input[type="text"]:active,
 *  input[type="time"]:active,
 *  input[type="url"]:active,
 *  input[type="week"]:active,
 *  input:not([type]):active,
 *  textarea:active': {
 *   'border': 'none'
 * }
 */
export default function textInputs(...states: Array<InteractionState>): string {
  return statefulSelectors(states, template, stateMap)
}
