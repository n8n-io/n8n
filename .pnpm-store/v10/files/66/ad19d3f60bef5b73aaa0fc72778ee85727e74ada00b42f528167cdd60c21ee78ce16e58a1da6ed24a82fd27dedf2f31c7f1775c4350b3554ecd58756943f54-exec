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

/**
 * @fileoverview Defines common conditions for use with
 * {@link webdriver.WebDriver#wait WebDriver wait}.
 *
 * Sample usage:
 *
 *     driver.get('http://www.google.com/ncr');
 *
 *     var query = driver.wait(until.elementLocated(By.name('q')));
 *     query.sendKeys('webdriver\n');
 *
 *     driver.wait(until.titleIs('webdriver - Google Search'));
 *
 * To define a custom condition, simply call WebDriver.wait with a function
 * that will eventually return a truthy-value (neither null, undefined, false,
 * 0, or the empty string):
 *
 *     driver.wait(function() {
 *       return driver.getTitle().then(function(title) {
 *         return title === 'webdriver - Google Search';
 *       });
 *     }, 1000);
 */

'use strict'

const by = require('./by')
const error = require('./error')
const webdriver = require('./webdriver')
const Condition = webdriver.Condition
const WebElementCondition = webdriver.WebElementCondition

/**
 * Creates a condition that will wait until the input driver is able to switch
 * to the designated frame. The target frame may be specified as
 *
 * 1. a numeric index into
 *     [window.frames](https://developer.mozilla.org/en-US/docs/Web/API/Window.frames)
 *     for the currently selected frame.
 * 2. a {@link ./webdriver.WebElement}, which must reference a FRAME or IFRAME
 *     element on the current page.
 * 3. a locator which may be used to first locate a FRAME or IFRAME on the
 *     current page before attempting to switch to it.
 *
 * Upon successful resolution of this condition, the driver will be left
 * focused on the new frame.
 *
 * @param {!(number|./webdriver.WebElement|By|
 *           function(!./webdriver.WebDriver): !./webdriver.WebElement)} frame
 *     The frame identifier.
 * @return {!Condition<boolean>} A new condition.
 */
function ableToSwitchToFrame(frame) {
  let condition
  if (typeof frame === 'number' || frame instanceof webdriver.WebElement) {
    condition = (driver) => attemptToSwitchFrames(driver, frame)
  } else {
    condition = function (driver) {
      let locator = /** @type {!(By|Function)} */ (frame)
      return driver.findElements(locator).then(function (els) {
        if (els.length) {
          return attemptToSwitchFrames(driver, els[0])
        }
      })
    }
  }

  return new Condition('to be able to switch to frame', condition)

  function attemptToSwitchFrames(driver, frame) {
    return driver
      .switchTo()
      .frame(frame)
      .then(
        function () {
          return true
        },
        function (e) {
          if (!(e instanceof error.NoSuchFrameError)) {
            throw e
          }
        },
      )
  }
}

/**
 * Creates a condition that waits for an alert to be opened. Upon success, the
 * returned promise will be fulfilled with the handle for the opened alert.
 *
 * @return {!Condition<!./webdriver.Alert>} The new condition.
 */
function alertIsPresent() {
  return new Condition('for alert to be present', function (driver) {
    return driver
      .switchTo()
      .alert()
      .catch(function (e) {
        if (
          !(
            e instanceof error.NoSuchAlertError ||
            // XXX: Workaround for GeckoDriver error `TypeError: can't convert null
            // to object`. For more details, see
            // https://github.com/SeleniumHQ/selenium/pull/2137
            (e instanceof error.WebDriverError && e.message === `can't convert null to object`)
          )
        ) {
          throw e
        }
      })
  })
}

/**
 * Creates a condition that will wait for the current page's title to match the
 * given value.
 *
 * @param {string} title The expected page title.
 * @return {!Condition<boolean>} The new condition.
 */
function titleIs(title) {
  return new Condition('for title to be ' + JSON.stringify(title), function (driver) {
    return driver.getTitle().then(function (t) {
      return t === title
    })
  })
}

/**
 * Creates a condition that will wait for the current page's title to contain
 * the given substring.
 *
 * @param {string} substr The substring that should be present in the page
 *     title.
 * @return {!Condition<boolean>} The new condition.
 */
function titleContains(substr) {
  return new Condition('for title to contain ' + JSON.stringify(substr), function (driver) {
    return driver.getTitle().then(function (title) {
      return title.indexOf(substr) !== -1
    })
  })
}

/**
 * Creates a condition that will wait for the current page's title to match the
 * given regular expression.
 *
 * @param {!RegExp} regex The regular expression to test against.
 * @return {!Condition<boolean>} The new condition.
 */
function titleMatches(regex) {
  return new Condition('for title to match ' + regex, function (driver) {
    return driver.getTitle().then(function (title) {
      return regex.test(title)
    })
  })
}

/**
 * Creates a condition that will wait for the current page's url to match the
 * given value.
 *
 * @param {string} url The expected page url.
 * @return {!Condition<boolean>} The new condition.
 */
function urlIs(url) {
  return new Condition('for URL to be ' + JSON.stringify(url), function (driver) {
    return driver.getCurrentUrl().then(function (u) {
      return u === url
    })
  })
}

/**
 * Creates a condition that will wait for the current page's url to contain
 * the given substring.
 *
 * @param {string} substrUrl The substring that should be present in the current
 *     URL.
 * @return {!Condition<boolean>} The new condition.
 */
function urlContains(substrUrl) {
  return new Condition('for URL to contain ' + JSON.stringify(substrUrl), function (driver) {
    return driver.getCurrentUrl().then(function (url) {
      return url && url.includes(substrUrl)
    })
  })
}

/**
 * Creates a condition that will wait for the current page's url to match the
 * given regular expression.
 *
 * @param {!RegExp} regex The regular expression to test against.
 * @return {!Condition<boolean>} The new condition.
 */
function urlMatches(regex) {
  return new Condition('for URL to match ' + regex, function (driver) {
    return driver.getCurrentUrl().then(function (url) {
      return regex.test(url)
    })
  })
}

/**
 * Creates a condition that will loop until an element is
 * {@link ./webdriver.WebDriver#findElement found} with the given locator.
 *
 * @param {!(By|Function)} locator The locator to use.
 * @return {!WebElementCondition} The new condition.
 */
function elementLocated(locator) {
  locator = by.checkedLocator(locator)
  let locatorStr = typeof locator === 'function' ? 'by function()' : locator + ''
  return new WebElementCondition('for element to be located ' + locatorStr, function (driver) {
    return driver.findElements(locator).then(function (elements) {
      return elements[0]
    })
  })
}

/**
 * Creates a condition that will loop until at least one element is
 * {@link ./webdriver.WebDriver#findElement found} with the given locator.
 *
 * @param {!(By|Function)} locator The locator to use.
 * @return {!Condition<!Array<!./webdriver.WebElement>>} The new
 *     condition.
 */
function elementsLocated(locator) {
  locator = by.checkedLocator(locator)
  let locatorStr = typeof locator === 'function' ? 'by function()' : locator + ''
  return new Condition('for at least one element to be located ' + locatorStr, function (driver) {
    return driver.findElements(locator).then(function (elements) {
      return elements.length > 0 ? elements : null
    })
  })
}

/**
 * Creates a condition that will wait for the given element to become stale. An
 * element is considered stale once it is removed from the DOM, or a new page
 * has loaded.
 *
 * @param {!./webdriver.WebElement} element The element that should become stale.
 * @return {!Condition<boolean>} The new condition.
 */
function stalenessOf(element) {
  return new Condition('element to become stale', function () {
    return element.getTagName().then(
      function () {
        return false
      },
      function (e) {
        if (e instanceof error.StaleElementReferenceError) {
          return true
        }
        throw e
      },
    )
  })
}

/**
 * Creates a condition that will wait for the given element to become visible.
 *
 * @param {!./webdriver.WebElement} element The element to test.
 * @return {!WebElementCondition} The new condition.
 * @see ./webdriver.WebDriver#isDisplayed
 */
function elementIsVisible(element) {
  return new WebElementCondition('until element is visible', function () {
    return element.isDisplayed().then((v) => (v ? element : null))
  })
}

/**
 * Creates a condition that will wait for the given element to be in the DOM,
 * yet not visible to the user.
 *
 * @param {!./webdriver.WebElement} element The element to test.
 * @return {!WebElementCondition} The new condition.
 * @see ./webdriver.WebDriver#isDisplayed
 */
function elementIsNotVisible(element) {
  return new WebElementCondition('until element is not visible', function () {
    return element.isDisplayed().then((v) => (v ? null : element))
  })
}

/**
 * Creates a condition that will wait for the given element to be enabled.
 *
 * @param {!./webdriver.WebElement} element The element to test.
 * @return {!WebElementCondition} The new condition.
 * @see webdriver.WebDriver#isEnabled
 */
function elementIsEnabled(element) {
  return new WebElementCondition('until element is enabled', function () {
    return element.isEnabled().then((v) => (v ? element : null))
  })
}

/**
 * Creates a condition that will wait for the given element to be disabled.
 *
 * @param {!./webdriver.WebElement} element The element to test.
 * @return {!WebElementCondition} The new condition.
 * @see webdriver.WebDriver#isEnabled
 */
function elementIsDisabled(element) {
  return new WebElementCondition('until element is disabled', function () {
    return element.isEnabled().then((v) => (v ? null : element))
  })
}

/**
 * Creates a condition that will wait for the given element to be selected.
 * @param {!./webdriver.WebElement} element The element to test.
 * @return {!WebElementCondition} The new condition.
 * @see webdriver.WebDriver#isSelected
 */
function elementIsSelected(element) {
  return new WebElementCondition('until element is selected', function () {
    return element.isSelected().then((v) => (v ? element : null))
  })
}

/**
 * Creates a condition that will wait for the given element to be deselected.
 *
 * @param {!./webdriver.WebElement} element The element to test.
 * @return {!WebElementCondition} The new condition.
 * @see webdriver.WebDriver#isSelected
 */
function elementIsNotSelected(element) {
  return new WebElementCondition('until element is not selected', function () {
    return element.isSelected().then((v) => (v ? null : element))
  })
}

/**
 * Creates a condition that will wait for the given element's
 * {@link webdriver.WebDriver#getText visible text} to match the given
 * {@code text} exactly.
 *
 * @param {!./webdriver.WebElement} element The element to test.
 * @param {string} text The expected text.
 * @return {!WebElementCondition} The new condition.
 * @see webdriver.WebDriver#getText
 */
function elementTextIs(element, text) {
  return new WebElementCondition('until element text is', function () {
    return element.getText().then((t) => (t === text ? element : null))
  })
}

/**
 * Creates a condition that will wait for the given element's
 * {@link webdriver.WebDriver#getText visible text} to contain the given
 * substring.
 *
 * @param {!./webdriver.WebElement} element The element to test.
 * @param {string} substr The substring to search for.
 * @return {!WebElementCondition} The new condition.
 * @see webdriver.WebDriver#getText
 */
function elementTextContains(element, substr) {
  return new WebElementCondition('until element text contains', function () {
    return element.getText().then((t) => (t.indexOf(substr) != -1 ? element : null))
  })
}

/**
 * Creates a condition that will wait for the given element's
 * {@link webdriver.WebDriver#getText visible text} to match a regular
 * expression.
 *
 * @param {!./webdriver.WebElement} element The element to test.
 * @param {!RegExp} regex The regular expression to test against.
 * @return {!WebElementCondition} The new condition.
 * @see webdriver.WebDriver#getText
 */
function elementTextMatches(element, regex) {
  return new WebElementCondition('until element text matches', function () {
    return element.getText().then((t) => (regex.test(t) ? element : null))
  })
}

// PUBLIC API

module.exports = {
  elementTextMatches,
  elementTextContains,
  elementTextIs,
  elementIsNotSelected,
  elementIsSelected,
  elementIsDisabled,
  ableToSwitchToFrame,
  elementIsEnabled,
  elementIsNotVisible,
  elementIsVisible,
  stalenessOf,
  elementsLocated,
  elementLocated,
  urlMatches,
  urlContains,
  urlIs,
  titleMatches,
  titleContains,
  alertIsPresent,
  titleIs,
}
