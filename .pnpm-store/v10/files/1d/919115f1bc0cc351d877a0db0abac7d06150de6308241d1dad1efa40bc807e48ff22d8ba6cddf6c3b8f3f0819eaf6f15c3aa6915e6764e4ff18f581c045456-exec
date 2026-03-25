// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

/*
 * Licensed to the Software Freedom Conservancy (SFC) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The SFC licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

'use strict'

const { By } = require('./by')
const error = require('./error')

/**
 * ISelect interface makes a protocol for all kind of select elements (standard html and custom
 * model)
 *
 * @interface
 */
// eslint-disable-next-line no-unused-vars
class ISelect {
  /**
   * @return {!Promise<boolean>} Whether this select element supports selecting multiple options at the same time? This
   * is done by checking the value of the "multiple" attribute.
   */
  isMultiple() {}

  /**
   * @return {!Promise<!Array<!WebElement>>} All options belonging to this select tag
   */
  getOptions() {}

  /**
   * @return {!Promise<!Array<!WebElement>>} All selected options belonging to this select tag
   */
  getAllSelectedOptions() {}

  /**
   * @return {!Promise<!WebElement>} The first selected option in this select tag (or the currently selected option in a
   * normal select)
   */
  getFirstSelectedOption() {}

  /**
   * Select all options that display text matching the argument. That is, when given "Bar" this
   * would select an option like:
   *
   * &lt;option value="foo"&gt;Bar&lt;/option&gt;
   *
   * @param {string} text The visible text to match against
   * @return {Promise<void>}
   */
  selectByVisibleText(text) {} // eslint-disable-line

  /**
   * Select all options that have a value matching the argument. That is, when given "foo" this
   * would select an option like:
   *
   * &lt;option value="foo"&gt;Bar&lt;/option&gt;
   *
   * @param {string} value The value to match against
   * @return {Promise<void>}
   */
  selectByValue(value) {} // eslint-disable-line

  /**
   * Select the option at the given index. This is done by examining the "index" attribute of an
   * element, and not merely by counting.
   *
   * @param {Number} index The option at this index will be selected
   * @return {Promise<void>}
   */
  selectByIndex(index) {} // eslint-disable-line

  /**
   * Clear all selected entries. This is only valid when the SELECT supports multiple selections.
   *
   * @return {Promise<void>}
   */
  deselectAll() {}

  /**
   * Deselect all options that display text matching the argument. That is, when given "Bar" this
   * would deselect an option like:
   *
   * &lt;option value="foo"&gt;Bar&lt;/option&gt;
   *
   * @param {string} text The visible text to match against
   * @return {Promise<void>}
   */
  deselectByVisibleText(text) {} // eslint-disable-line

  /**
   * Deselect all options that have a value matching the argument. That is, when given "foo" this
   * would deselect an option like:
   *
   * @param {string} value The value to match against
   * @return {Promise<void>}
   */
  deselectByValue(value) {} // eslint-disable-line

  /**
   * Deselect the option at the given index. This is done by examining the "index" attribute of an
   * element, and not merely by counting.
   *
   * @param {Number} index The option at this index will be deselected
   * @return {Promise<void>}
   */
  deselectByIndex(index) {} // eslint-disable-line
}

/**
 * @implements ISelect
 */
class Select {
  /**
   * Create an Select Element
   * @param {WebElement} element Select WebElement.
   */
  constructor(element) {
    if (element === null) {
      throw new Error(`Element must not be null. Please provide a valid <select> element.`)
    }

    this.element = element

    this.element.getAttribute('tagName').then(function (tagName) {
      if (tagName.toLowerCase() !== 'select') {
        throw new Error(`Select only works on <select> elements`)
      }
    })

    this.element.getAttribute('multiple').then((multiple) => {
      this.multiple = multiple !== null && multiple !== 'false'
    })
  }

  /**
   *
   * Select option with specified index.
   *
   * <example>
   <select id="selectbox">
   <option value="1">Option 1</option>
   <option value="2">Option 2</option>
   <option value="3">Option 3</option>
   </select>
   const selectBox = await driver.findElement(By.id("selectbox"));
   await selectObject.selectByIndex(1);
   * </example>
   *
   * @param index
   */
  async selectByIndex(index) {
    if (index < 0) {
      throw new Error('Index needs to be 0 or any other positive number')
    }

    let options = await this.element.findElements(By.tagName('option'))

    if (options.length === 0) {
      throw new Error("Select element doesn't contain any option element")
    }

    if (options.length - 1 < index) {
      throw new Error(
        `Option with index "${index}" not found. Select element only contains ${options.length - 1} option elements`,
      )
    }

    for (let option of options) {
      if ((await option.getAttribute('index')) === index.toString()) {
        await this.setSelected(option)
      }
    }
  }

  /**
   *
   * Select option by specific value.
   *
   * <example>
   <select id="selectbox">
   <option value="1">Option 1</option>
   <option value="2">Option 2</option>
   <option value="3">Option 3</option>
   </select>
   const selectBox = await driver.findElement(By.id("selectbox"));
   await selectObject.selectByVisibleText("Option 2");
   * </example>
   *
   *
   * @param {string} value value of option element to be selected
   */
  async selectByValue(value) {
    let matched = false
    let isMulti = await this.isMultiple()

    let options = await this.element.findElements(By.xpath('.//option[@value = ' + escapeQuotes(value) + ']'))

    for (let option of options) {
      await this.setSelected(option)

      if (!isMulti) {
        return
      }
      matched = true
    }

    if (!matched) {
      throw new Error(`Cannot locate option with value: ${value}`)
    }
  }

  /**
   *
   * Select option with displayed text matching the argument.
   *
   * <example>
   <select id="selectbox">
   <option value="1">Option 1</option>
   <option value="2">Option 2</option>
   <option value="3">Option 3</option>
   </select>
   const selectBox = await driver.findElement(By.id("selectbox"));
   await selectObject.selectByVisibleText("Option 2");
   * </example>
   *
   * @param {String|Number} text       text of option element to get selected
   *
   */
  async selectByVisibleText(text) {
    text = typeof text === 'number' ? text.toString() : text

    const xpath = './/option[normalize-space(.) = ' + escapeQuotes(text) + ']'

    const options = await this.element.findElements(By.xpath(xpath))

    for (let option of options) {
      await this.setSelected(option)
      if (!(await this.isMultiple())) {
        return
      }
    }

    let matched = Array.isArray(options) && options.length > 0

    if (!matched && text.includes(' ')) {
      const subStringWithoutSpace = getLongestSubstringWithoutSpace(text)
      let candidates
      if ('' === subStringWithoutSpace) {
        candidates = await this.element.findElements(By.tagName('option'))
      } else {
        const xpath = './/option[contains(., ' + escapeQuotes(subStringWithoutSpace) + ')]'
        candidates = await this.element.findElements(By.xpath(xpath))
      }

      const trimmed = text.trim()

      for (let option of candidates) {
        const optionText = await option.getText()
        if (trimmed === optionText.trim()) {
          await this.setSelected(option)
          if (!(await this.isMultiple())) {
            return
          }
          matched = true
        }
      }
    }

    if (!matched) {
      throw new Error(`Cannot locate option with text: ${text}`)
    }
  }

  /**
   * Returns a list of all options belonging to this select tag
   * @returns {!Promise<!Array<!WebElement>>}
   */
  async getOptions() {
    return await this.element.findElements({ tagName: 'option' })
  }

  /**
   * Returns a boolean value if the select tag is multiple
   * @returns {Promise<boolean>}
   */
  async isMultiple() {
    return this.multiple
  }

  /**
   * Returns a list of all selected options belonging to this select tag
   *
   * @returns {Promise<void>}
   */
  async getAllSelectedOptions() {
    const opts = await this.getOptions()
    const results = []
    for (let options of opts) {
      if (await options.isSelected()) {
        results.push(options)
      }
    }
    return results
  }

  /**
   * Returns first Selected Option
   * @returns {Promise<Element>}
   */
  async getFirstSelectedOption() {
    return (await this.getAllSelectedOptions())[0]
  }

  /**
   * Deselects all selected options
   * @returns {Promise<void>}
   */
  async deselectAll() {
    if (!this.isMultiple()) {
      throw new Error('You may only deselect all options of a multi-select')
    }

    const options = await this.getOptions()

    for (let option of options) {
      if (await option.isSelected()) {
        await option.click()
      }
    }
  }

  /**
   *
   * @param {string|Number}text text of option to deselect
   * @returns {Promise<void>}
   */
  async deselectByVisibleText(text) {
    if (!(await this.isMultiple())) {
      throw new Error('You may only deselect options of a multi-select')
    }

    /**
     * convert value into string
     */
    text = typeof text === 'number' ? text.toString() : text

    const optionElement = await this.element.findElement(
      By.xpath('.//option[normalize-space(.) = ' + escapeQuotes(text) + ']'),
    )
    if (await optionElement.isSelected()) {
      await optionElement.click()
    }
  }

  /**
   *
   * @param {Number} index       index of option element to deselect
   * Deselect the option at the given index.
   * This is done by examining the "index"
   * attribute of an element, and not merely by counting.
   * @returns {Promise<void>}
   */
  async deselectByIndex(index) {
    if (!(await this.isMultiple())) {
      throw new Error('You may only deselect options of a multi-select')
    }

    if (index < 0) {
      throw new Error('Index needs to be 0 or any other positive number')
    }

    let options = await this.element.findElements(By.tagName('option'))

    if (options.length === 0) {
      throw new Error("Select element doesn't contain any option element")
    }

    if (options.length - 1 < index) {
      throw new Error(
        `Option with index "${index}" not found. Select element only contains ${options.length - 1} option elements`,
      )
    }

    for (let option of options) {
      if ((await option.getAttribute('index')) === index.toString()) {
        if (await option.isSelected()) {
          await option.click()
        }
      }
    }
  }

  /**
   *
   * @param {String} value value of an option to deselect
   * @returns {Promise<void>}
   */
  async deselectByValue(value) {
    if (!(await this.isMultiple())) {
      throw new Error('You may only deselect options of a multi-select')
    }

    let matched = false

    let options = await this.element.findElements(By.xpath('.//option[@value = ' + escapeQuotes(value) + ']'))

    if (options.length === 0) {
      throw new Error(`Cannot locate option with value: ${value}`)
    }

    for (let option of options) {
      if (await option.isSelected()) {
        await option.click()
      }
      matched = true
    }

    if (!matched) {
      throw new Error(`Cannot locate option with value: ${value}`)
    }
  }

  async setSelected(option) {
    if (!(await option.isSelected())) {
      if (!(await option.isEnabled())) {
        throw new error.UnsupportedOperationError(`You may not select a disabled option`)
      }
      await option.click()
    }
  }
}

function escapeQuotes(toEscape) {
  if (toEscape.includes(`"`) && toEscape.includes(`'`)) {
    const quoteIsLast = toEscape.lastIndexOf(`"`) === toEscape.length - 1
    const substrings = toEscape.split(`"`)

    // Remove the last element if it's an empty string
    if (substrings[substrings.length - 1] === '') {
      substrings.pop()
    }

    let result = 'concat('

    for (let i = 0; i < substrings.length; i++) {
      result += `"${substrings[i]}"`
      result += i === substrings.length - 1 ? (quoteIsLast ? `, '"')` : `)`) : `, '"', `
    }
    return result
  }

  if (toEscape.includes('"')) {
    return `'${toEscape}'`
  }

  // Otherwise return the quoted string
  return `"${toEscape}"`
}

function getLongestSubstringWithoutSpace(text) {
  let words = text.split(' ')
  let longestString = ''
  for (let word of words) {
    if (word.length > longestString.length) {
      longestString = word
    }
  }
  return longestString
}

module.exports = { Select, escapeQuotes }
