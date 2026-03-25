// Disable automatic exports.

import { ARIARole } from './aria-role.ts'
import { Locator, ScreenshotComparatorRegistry, ScreenshotMatcherOptions } from './context.js'

export interface TestingLibraryMatchers<E, R> {
  /**
   * @description
   * Assert whether an element is present in the document or not.
   * @example
   * <svg data-testid="svg-element"></svg>
   *
   * await expect.element(page.getByTestId('svg-element')).toBeInTheDocument()
   * await expect.element(page.getByTestId('does-not-exist')).not.toBeInTheDocument()
   * @see https://vitest.dev/api/browser/assertions#tobeinthedocument
   */
  toBeInTheDocument(): R
  /**
   * @description
   * Assert whether an element is within the viewport or not.
   *
   * An element is considered to be in the viewport if any part of it intersects with the current viewport bounds.
   * This matcher calculates the intersection ratio between the element and the viewport, similar to the
   * IntersectionObserver API.
   *
   * The element must be in the document and have visible dimensions. Elements with display: none or
   * visibility: hidden are considered not in viewport.
   * @example
   * <div
   *   data-testid="visible-element"
   *   style="position: absolute; top: 10px; left: 10px; width: 50px; height: 50px;"
   * >
   *   Visible Element
   * </div>
   *
   * <div
   *   data-testid="hidden-element"
   *   style="position: fixed; top: -100px; left: 10px; width: 50px; height: 50px;"
   * >
   *   Hidden Element
   * </div>
   *
   * <div
   *   data-testid="large-element"
   *   style="height: 400vh;"
   * >
   *   Large Element
   * </div>
   *
   * // Check if any part of element is in viewport
   * await expect.element(page.getByTestId('visible-element')).toBeInViewport()
   *
   * // Check if element is outside viewport
   * await expect.element(page.getByTestId('hidden-element')).not.toBeInViewport()
   *
   * // Check if at least 50% of element is visible
   * await expect.element(page.getByTestId('large-element')).toBeInViewport({ ratio: 0.5 })
   *
   * // Check if element is completely visible
   * await expect.element(page.getByTestId('visible-element')).toBeInViewport({ ratio: 1 })
   * @see https://vitest.dev/api/browser/assertions#tobeinviewport
   */
  toBeInViewport(options?: { ratio?: number }): R
  /**
   * @description
   * This allows you to check if an element is currently visible to the user.
   *
   * An element is visible if **all** the following conditions are met:
   * * it does not have its css property display set to none
   * * it does not have its css property visibility set to either hidden or collapse
   * * it does not have its css property opacity set to 0
   * * its parent element is also visible (and so on up to the top of the DOM tree)
   * * it does not have the hidden attribute
   * * if `<details />` it has the open attribute
   * @example
   * <div
   *   data-testid="zero-opacity"
   *   style="opacity: 0"
   * >
   *   Zero Opacity
   * </div>
   *
   * <div data-testid="visible">Visible Example</div>
   *
   * await expect.element(page.getByTestId('zero-opacity')).not.toBeVisible()
   * await expect.element(page.getByTestId('visible')).toBeVisible()
   * @see https://vitest.dev/api/browser/assertions#tobevisible
   */
  toBeVisible(): R
  /**
   * @description
   * Assert whether an element has content or not.
   * @example
   * <span data-testid="not-empty">
   *   <span data-testid="empty"></span>
   * </span>
   *
   * await expect.element(page.getByTestId('empty')).toBeEmptyDOMElement()
   * await expect.element(page.getByTestId('not-empty')).not.toBeEmptyDOMElement()
   * @see https://vitest.dev/api/browser/assertions#tobeemptydomelement
   */
  toBeEmptyDOMElement(): R
  /**
   * @description
   * Allows you to check whether an element is disabled from the user's perspective.
   *
   * Matches if the element is a form control and the `disabled` attribute is specified on this element or the
   * element is a descendant of a form element with a `disabled` attribute.
   * @example
   * <button
   *   data-testid="button"
   *   type="submit"
   *   disabled
   * >
   *   submit
   * </button>
   *
   * await expect.element(page.getByTestId('button')).toBeDisabled()
   * @see https://vitest.dev/api/browser/assertions#tobedisabled
   */
  toBeDisabled(): R
  /**
   * @description
   * Allows you to check whether an element is not disabled from the user's perspective.
   *
   * Works like `not.toBeDisabled()`.
   *
   * Use this matcher to avoid double negation in your tests.
   * @example
   * <button
   *   data-testid="button"
   *   type="submit"
   * >
   *   submit
   * </button>
   *
   * await expect.element(page.getByTestId('button')).toBeEnabled()
   * @see https://vitest.dev/api/browser/assertions#tobeenabled
   */
  toBeEnabled(): R
  /**
   * @description
   * Check if a form element, or the entire `form`, is currently invalid.
   *
   * An `input`, `select`, `textarea`, or `form` element is invalid if it has an `aria-invalid` attribute with no
   * value or a value of "true", or if the result of `checkValidity()` is false.
   * @example
   * <input data-testid="no-aria-invalid" />
   *
   * <form data-testid="invalid-form">
   *   <input required />
   * </form>
   *
   * await expect(page.getByTestId('no-aria-invalid')).not.toBeInvalid()
   * await expect(page.getByTestId('invalid-form')).toBeInvalid()
   * @see https://vitest.dev/api/browser/assertions#tobeinvalid
   */
  toBeInvalid(): R
  /**
   * @description
   * This allows you to check if a form element is currently required.
   *
   * An element is required if it is having a `required` or `aria-required="true"` attribute.
   * @example
   * <input data-testid="required-input" required />
   * <div
   *   data-testid="supported-role"
   *   role="tree"
   *   required />
   *
   * await expect.element(page.getByTestId('required-input')).toBeRequired()
   * await expect.element(page.getByTestId('supported-role')).not.toBeRequired()
   * @see https://vitest.dev/api/browser/assertions#toberequired
   */
  toBeRequired(): R
  /**
   * @description
   * Allows you to check if a form element is currently required.
   *
   * An `input`, `select`, `textarea`, or `form` element is invalid if it has an `aria-invalid` attribute with no
   * value or a value of "false", or if the result of `checkValidity()` is true.
   * @example
   * <input data-testid="aria-invalid" aria-invalid />
   *
   * <form data-testid="valid-form">
   *   <input />
   * </form>
   *
   * await expect.element(page.getByTestId('no-aria-invalid')).not.toBeValid()
   * await expect.element(page.getByTestId('invalid-form')).toBeInvalid()
   * @see https://vitest.dev/api/browser/assertions#tobevalid
   */
  toBeValid(): R
  /**
   * @description
   * Allows you to assert whether an element contains another element as a descendant or not.
   * @example
   * <span data-testid="ancestor">
   *   <span data-testid="descendant"></span>
   * </span>
   *
   * const ancestor = page.getByTestId('ancestor')
   * const descendant = page.getByTestId('descendant')
   * const nonExistentElement = page.getByTestId('does-not-exist')
   * await expect.element(ancestor).toContainElement(descendant)
   * await expect.element(descendant).not.toContainElement(ancestor)
   * await expect.element(ancestor).not.toContainElement(nonExistentElement)
   * @see https://vitest.dev/api/browser/assertions#tocontainelement
   */
  toContainElement(element: HTMLElement | SVGElement | Locator | null): R
  /**
   * @description
   * Assert whether a string representing a HTML element is contained in another element.
   * @example
   * <span data-testid="parent"><span data-testid="child"></span></span>
   *
   * const parent = page.getByTestId('parent')
   * await expect.element(parent).toContainHTML('<span data-testid="child"></span>')
   * @see https://vitest.dev/api/browser/assertions#tocontainhtml
   */
  toContainHTML(htmlText: string): R
  /**
   * @description
   * Allows you to check if a given element has an attribute or not.
   *
   * You can also optionally check that the attribute has a specific expected value or partial match using
   * [expect.stringContaining](https://jestjs.io/docs/en/expect.html#expectnotstringcontainingstring) or
   * [expect.stringMatching](https://jestjs.io/docs/en/expect.html#expectstringmatchingstring-regexp).
   * @example
   * <button
   *   data-testid="ok-button"
   *   type="submit"
   *   disabled
   * >
   *   ok
   * </button>
   *
   * await expect.element(button).toHaveAttribute('disabled')
   * await expect.element(button).toHaveAttribute('type', 'submit')
   * await expect.element(button).not.toHaveAttribute('type', 'button')
   * @see https://vitest.dev/api/browser/assertions#tohaveattribute
   */
  toHaveAttribute(attr: string, value?: unknown): R
  /**
   * @description
   * Check whether the given element has certain classes within its `class` attribute.
   *
   * You must provide at least one class, unless you are asserting that an element does not have any classes.
   * @example
   * <button
   *   data-testid="delete-button"
   *   class="btn xs btn-danger"
   * >
   *   delete item
   * </button>
   *
   * <div data-testid="no-classes">no classes</div>
   *
   * const deleteButton = page.getByTestId('delete-button')
   * const noClasses = page.getByTestId('no-classes')
   * await expect.element(deleteButton).toHaveClass('btn')
   * await expect.element(deleteButton).toHaveClass('btn-danger xs')
   * await expect.element(deleteButton).toHaveClass(/danger/, 'xs')
   * await expect.element(deleteButton).toHaveClass('btn xs btn-danger', {exact: true})
   * await expect.element(deleteButton).not.toHaveClass('btn xs btn-danger', {exact: true})
   * await expect.element(noClasses).not.toHaveClass()
   * @see https://vitest.dev/api/browser/assertions#tohaveclass
   */
  toHaveClass(...classNames:
   | (string | RegExp)[]
   | [string, options?: {exact: boolean}]
   | [string, string, options?: {exact: boolean}]
   | [string, string, string, options?: {exact: boolean}]
   | [string, string, string, string, options?: {exact: boolean}]
   | [string, string, string, string, string, options?: {exact: boolean}]
   | [string, string, string, string, string, string, options?: {exact: boolean}]
   | [string, string, string, string, string, string, string, options?: {exact: boolean}]
   | [string, string, string, string, string, string, string, string, options?: {exact: boolean}]
   | [string, string, string, string, string, string, string, string, string, options?: {exact: boolean}]
  ): R
  /**
   * @description
   * This allows you to check whether the given form element has the specified displayed value (the one the
   * end user will see). It accepts <input>, <select> and <textarea> elements with the exception of <input type="checkbox">
   * and <input type="radio">, which can be meaningfully matched only using toBeChecked or toHaveFormValues.
   * @example
   * <label for="input-example">First name</label>
   * <input type="text" id="input-example" value="Luca" />
   *
   * <label for="textarea-example">Description</label>
   * <textarea id="textarea-example">An example description here.</textarea>
   *
   * <label for="single-select-example">Fruit</label>
   * <select id="single-select-example">
   *   <option value="">Select a fruit...</option>
   *   <option value="banana">Banana</option>
   *   <option value="ananas">Ananas</option>
   *   <option value="avocado">Avocado</option>
   * </select>
   *
   * <label for="multiple-select-example">Fruits</label>
   * <select id="multiple-select-example" multiple>
   *   <option value="">Select a fruit...</option>
   *   <option value="banana" selected>Banana</option>
   *   <option value="ananas">Ananas</option>
   *   <option value="avocado" selected>Avocado</option>
   * </select>
   *
   * const input = page.getByLabelText('First name')
   * const textarea = page.getByLabelText('Description')
   * const selectSingle = page.getByLabelText('Fruit')
   * const selectMultiple = page.getByLabelText('Fruits')
   *
   * await expect.element(input).toHaveDisplayValue('Luca')
   * await expect.element(textarea).toHaveDisplayValue('An example description here.')
   * await expect.element(selectSingle).toHaveDisplayValue('Select a fruit...')
   * await expect.element(selectMultiple).toHaveDisplayValue(['Banana', 'Avocado'])
   *
   * @see https://vitest.dev/api/browser/assertions#tohavedisplayvalue
   */
  toHaveDisplayValue(value: string | number | RegExp | Array<string | RegExp | number>): R
  /**
   * @description
   * Assert whether an element has focus or not.
   * @example
   * <div>
   *   <input type="text" data-testid="element-to-focus" />
   * </div>
   *
   * const input = page.getByTestId('element-to-focus')
   * input.element().focus()
   * await expect.element(input).toHaveFocus()
   * input.element().blur()
   * await expect.element(input).not.toHaveFocus()
   * @see https://vitest.dev/api/browser/assertions#tohavefocus
   */
  toHaveFocus(): R
  /**
   * @description
   * Check if a form or fieldset contains form controls for each given name, and having the specified value.
   *
   * Can only be invoked on a form or fieldset element.
   * @example
   * <form data-testid="login-form">
   *   <input type="text" name="username" value="jane.doe" />
   *   <input type="password" name="password" value="123" />
   *   <input type="checkbox" name="rememberMe" checked />
   *   <button type="submit">Sign in</button>
   * </form>
   *
   * await expect.element(page.getByTestId('login-form')).toHaveFormValues({
   *   username: 'jane.doe',
   *   rememberMe: true,
   * })
   * @see https://vitest.dev/api/browser/assertions#tohaveformvalues
   */
  toHaveFormValues(expectedValues: Record<string, unknown>): R
  /**
   * @description
   * Check if an element has specific css properties with specific values applied.
   *
   * Only matches if the element has *all* the expected properties applied, not just some of them.
   * @example
   * <button
   *   data-testid="submit-button"
   *   style="background-color: green; display: none"
   * >
   *   submit
   * </button>
   *
   * const button = page.getByTestId('submit-button')
   * await expect.element(button).toHaveStyle('background-color: green')
   * await expect.element(button).toHaveStyle({
   *   'background-color': 'green',
   *   display: 'none'
   * })
   * @see https://vitest.dev/api/browser/assertions#tohavestyle
   */
  toHaveStyle(css: string | Partial<CSSStyleDeclaration>): R
  /**
   * @description
   * Check whether the given element has a text content or not.
   *
   * When a string argument is passed through, it will perform a partial case-sensitive match to the element
   * content.
   *
   * To perform a case-insensitive match, you can use a RegExp with the `/i` modifier.
   *
   * If you want to match the whole content, you can use a RegExp to do it.
   * @example
   * <span data-testid="text-content">Text Content</span>
   *
   * const element = page.getByTestId('text-content')
   * await expect.element(element).toHaveTextContent('Content')
   * // to match the whole content
   * await expect.element(element).toHaveTextContent(/^Text Content$/)
   * // to use case-insensitive match
   * await expect.element(element).toHaveTextContent(/content$/i)
   * await expect.element(element).not.toHaveTextContent('content')
   * @see https://vitest.dev/api/browser/assertions#tohavetextcontent
   */
  toHaveTextContent(
    text: string | number | RegExp,
    options?: {normalizeWhitespace: boolean},
  ): R
  /**
   * @description
   * Check whether the given form element has the specified value.
   *
   * Accepts `<input>`, `<select>`, and `<textarea>` elements with the exception of `<input type="checkbox">` and
   * `<input type="radiobox">`, which can be matched only using
   * [toBeChecked](https://vitest.dev/api/browser/assertions#tobechecked) or
   * [toHaveFormValues](https://vitest.dev/api/browser/assertions#tohaveformvalues).
   * @example
   * <input
   *   type="number"
   *   value="5"
   *   data-testid="input-number" />
   *
   * const numberInput = page.getByTestId('input-number')
   * await expect.element(numberInput).toHaveValue(5)
   * @see https://vitest.dev/api/browser/assertions#tohavevalue
   */
  toHaveValue(value?: string | string[] | number | null): R
  /**
   * @description
   * Assert whether the given element is checked.
   *
   * It accepts an `input` of type `checkbox` or `radio` and elements with a `role` of `radio` with a valid
   * `aria-checked` attribute of "true" or "false".
   * @example
   * <input
   *   type="checkbox"
   *   checked
   *   data-testid="input-checkbox" />
   * <input
   *   type="radio"
   *   value="foo"
   *   data-testid="input-radio" />
   *
   * const inputCheckbox = page.getByTestId('input-checkbox')
   * const inputRadio = page.getByTestId('input-radio')
   * await expect.element(inputCheckbox).toBeChecked()
   * await expect.element(inputRadio).not.toBeChecked()
   * @see https://vitest.dev/api/browser/assertions#tobechecked
   */
  toBeChecked(): R
  /**
   * @description
   * This allows to assert that an element has the expected [accessible description](https://w3c.github.io/accname/).
   *
   * You can pass the exact string of the expected accessible description, or you can make a
   * partial match passing a regular expression, or by using either
   * [expect.stringContaining](https://jestjs.io/docs/en/expect.html#expectnotstringcontainingstring)
   * or [expect.stringMatching](https://jestjs.io/docs/en/expect.html#expectstringmatchingstring-regexp).
   * @example
   * <a data-testid="link" href="/" aria-label="Home page" title="A link to start over">Start</a>
   * <a data-testid="extra-link" href="/about" aria-label="About page">About</a>
   * <img src="avatar.jpg" data-testid="avatar" alt="User profile pic" />
   * <img src="logo.jpg" data-testid="logo" alt="Company logo" aria-describedby="t1" />
   * <span id="t1" role="presentation">The logo of Our Company</span>
   *
   * await expect.element(page.getByTestId('link')).toHaveAccessibleDescription()
   * await expect.element(page.getByTestId('link')).toHaveAccessibleDescription('A link to start over')
   * await expect.element(page.getByTestId('link')).not.toHaveAccessibleDescription('Home page')
   * await expect.element(page.getByTestId('extra-link')).not.toHaveAccessibleDescription()
   * await expect.element(page.getByTestId('avatar')).not.toHaveAccessibleDescription()
   * await expect.element(page.getByTestId('logo')).not.toHaveAccessibleDescription('Company logo')
   * await expect.element(page.getByTestId('logo')).toHaveAccessibleDescription('The logo of Our Company')
   * @see https://vitest.dev/api/browser/assertions#tohaveaccessibledescription
   */
  toHaveAccessibleDescription(text?: string | RegExp | E): R

  /**
   * @description
   * This allows you to assert that an element has the expected
   * [accessible error message](https://w3c.github.io/aria/#aria-errormessage).
   *
   * You can pass the exact string of the expected accessible error message.
   * Alternatively, you can perform a partial match by passing a regular expression
   * or by using either
   * [expect.stringContaining](https://jestjs.io/docs/en/expect.html#expectnotstringcontainingstring)
   * or [expect.stringMatching](https://jestjs.io/docs/en/expect.html#expectstringmatchingstring-regexp).
   *
   * @example
   * <input aria-label="Has Error" aria-invalid="true" aria-errormessage="error-message" />
   * <div id="error-message" role="alert">This field is invalid</div>
   *
   * <input aria-label="No Error Attributes" />
   * <input aria-label="Not Invalid" aria-invalid="false" aria-errormessage="error-message" />
   *
   * // Inputs with Valid Error Messages
   * await expect.element(page.getByRole('textbox', {name: 'Has Error'})).toHaveAccessibleErrorMessage()
   * await expect.element(page.getByRole('textbox', {name: 'Has Error'})).toHaveAccessibleErrorMessage('This field is invalid')
   * await expect.element(page.getByRole('textbox', {name: 'Has Error'})).toHaveAccessibleErrorMessage(/invalid/i)
   * await expect.element(
   *   page.getByRole('textbox', {name: 'Has Error'}),
   * ).not.toHaveAccessibleErrorMessage('This field is absolutely correct!')
   *
   * // Inputs without Valid Error Messages
   * await expect.element(
   *   page.getByRole('textbox', {name: 'No Error Attributes'}),
   * ).not.toHaveAccessibleErrorMessage()
   *
   * await expect.element(
   *   page.getByRole('textbox', {name: 'Not Invalid'}),
   * ).not.toHaveAccessibleErrorMessage()
   *
   * @see https://vitest.dev/api/browser/assertions#tohaveaccessibleerrormessage
   */
  toHaveAccessibleErrorMessage(text?: string | RegExp | E): R

  /**
   * @description
   * This allows to assert that an element has the expected [accessible name](https://w3c.github.io/accname/).
   * It is useful, for instance, to assert that form elements and buttons are properly labelled.
   *
   * You can pass the exact string of the expected accessible name, or you can make a
   * partial match passing a regular expression, or by using either
   * [expect.stringContaining](https://jestjs.io/docs/en/expect.html#expectnotstringcontainingstring)
   * or [expect.stringMatching](https://jestjs.io/docs/en/expect.html#expectstringmatchingstring-regexp).
   * @example
   * <img data-testid="img-alt" src="" alt="Test alt" />
   * <img data-testid="img-empty-alt" src="" alt="" />
   * <svg data-testid="svg-title"><title>Test title</title></svg>
   * <button data-testid="button-img-alt"><img src="" alt="Test" /></button>
   * <p><img data-testid="img-paragraph" src="" alt="" /> Test content</p>
   * <button data-testid="svg-button"><svg><title>Test</title></svg></p>
   * <div><svg data-testid="svg-without-title"></svg></div>
   * <input data-testid="input-title" title="test" />
   *
   * await expect.element(page.getByTestId('img-alt')).toHaveAccessibleName('Test alt')
   * await expect.element(page.getByTestId('img-empty-alt')).not.toHaveAccessibleName()
   * await expect.element(page.getByTestId('svg-title')).toHaveAccessibleName('Test title')
   * await expect.element(page.getByTestId('button-img-alt')).toHaveAccessibleName()
   * await expect.element(page.getByTestId('img-paragraph')).not.toHaveAccessibleName()
   * await expect.element(page.getByTestId('svg-button')).toHaveAccessibleName()
   * await expect.element(page.getByTestId('svg-without-title')).not.toHaveAccessibleName()
   * await expect.element(page.getByTestId('input-title')).toHaveAccessibleName()
   * @see https://vitest.dev/api/browser/assertions#tohaveaccessiblename
   */
  toHaveAccessibleName(text?: string | RegExp | E): R
  /**
   * @description
   * This allows you to assert that an element has the expected
   * [role](https://www.w3.org/TR/html-aria/#docconformance).
   *
   * This is useful in cases where you already have access to an element via
   * some query other than the role itself, and want to make additional
   * assertions regarding its accessibility.
   *
   * The role can match either an explicit role (via the `role` attribute), or
   * an implicit one via the [implicit ARIA
   * semantics](https://www.w3.org/TR/html-aria/).
   *
   * Note: roles are matched literally by string equality, without inheriting
   * from the ARIA role hierarchy. As a result, querying a superclass role
   * like 'checkbox' will not include elements with a subclass role like
   * 'switch'.
   *
   * @example
   * <button data-testid="button">Continue</button>
   * <div role="button" data-testid="button-explicit">Continue</button>
   * <button role="switch button" data-testid="button-explicit-multiple">Continue</button>
   * <a href="/about" data-testid="link">About</a>
   * <a data-testid="link-invalid">Invalid link<a/>
   *
   * await expect.element(page.getByTestId('button')).toHaveRole('button')
   * await expect.element(page.getByTestId('button-explicit')).toHaveRole('button')
   * await expect.element(page.getByTestId('button-explicit-multiple')).toHaveRole('button')
   * await expect.element(page.getByTestId('button-explicit-multiple')).toHaveRole('switch')
   * await expect.element(page.getByTestId('link')).toHaveRole('link')
   * await expect.element(page.getByTestId('link-invalid')).not.toHaveRole('link')
   * await expect.element(page.getByTestId('link-invalid')).toHaveRole('generic')
   *
   * @see https://vitest.dev/api/browser/assertions#tohaverole
   */
  toHaveRole(
    // Get autocomplete for ARIARole union types, while still supporting another string
    // Ref: https://github.com/microsoft/TypeScript/issues/29729#issuecomment-567871939
    role: ARIARole | (string & {}),
  ): R
  /**
   * @description
   * This allows you to check whether the given element is partially checked.
   * It accepts an input of type checkbox and elements with a role of checkbox
   * with a aria-checked="mixed", or input of type checkbox with indeterminate
   * set to true
   *
   * @example
   * <input type="checkbox" aria-checked="mixed" data-testid="aria-checkbox-mixed" />
   * <input type="checkbox" checked data-testid="input-checkbox-checked" />
   * <input type="checkbox" data-testid="input-checkbox-unchecked" />
   * <div role="checkbox" aria-checked="true" data-testid="aria-checkbox-checked" />
   * <div
   *   role="checkbox"
   *   aria-checked="false"
   *   data-testid="aria-checkbox-unchecked"
   * />
   * <input type="checkbox" data-testid="input-checkbox-indeterminate" />
   *
   * const ariaCheckboxMixed = getByTestId('aria-checkbox-mixed')
   * const inputCheckboxChecked = getByTestId('input-checkbox-checked')
   * const inputCheckboxUnchecked = getByTestId('input-checkbox-unchecked')
   * const ariaCheckboxChecked = getByTestId('aria-checkbox-checked')
   * const ariaCheckboxUnchecked = getByTestId('aria-checkbox-unchecked')
   * const inputCheckboxIndeterminate = getByTestId('input-checkbox-indeterminate')
   *
   * await expect.element(ariaCheckboxMixed).toBePartiallyChecked()
   * await expect.element(inputCheckboxChecked).not.toBePartiallyChecked()
   * await expect.element(inputCheckboxUnchecked).not.toBePartiallyChecked()
   * await expect.element(ariaCheckboxChecked).not.toBePartiallyChecked()
   * await expect.element(ariaCheckboxUnchecked).not.toBePartiallyChecked()
   *
   * inputCheckboxIndeterminate.indeterminate = true
   * await expect.element(inputCheckboxIndeterminate).toBePartiallyChecked()
   * @see https://vitest.dev/api/browser/assertions#tobepartiallychecked
   */
  toBePartiallyChecked(): R
  /**
   * @description
   * This allows to assert that an element has a
   * [text selection](https://developer.mozilla.org/en-US/docs/Web/API/Selection).
   *
   * This is useful to check if text or part of the text is selected within an
   * element. The element can be either an input of type text, a textarea, or any
   * other element that contains text, such as a paragraph, span, div etc.
   *
   * NOTE: the expected selection is a string, it does not allow to check for
   * selection range indices.
   *
   * @example
   * <div>
   * <input type="text" value="text selected text" data-testid="text" />
   * <textarea data-testid="textarea">text selected text</textarea>
   * <p data-testid="prev">prev</p>
   * <p data-testid="parent">text <span data-testid="child">selected</span> text</p>
   * <p data-testid="next">next</p>
   * </div>
   *
   * page.getByTestId('text').element().setSelectionRange(5, 13)
   * await expect.element(page.getByTestId('text')).toHaveSelection('selected')
   *
   * page.getByTestId('textarea').element().setSelectionRange(0, 5)
   * await expect.element('textarea').toHaveSelection('text ')
   *
   * const selection = document.getSelection()
   * const range = document.createRange()
   * selection.removeAllRanges()
   * selection.empty()
   * selection.addRange(range)
   *
   * // selection of child applies to the parent as well
   * range.selectNodeContents(page.getByTestId('child').element())
   * await expect.element(page.getByTestId('child')).toHaveSelection('selected')
   * await expect.element(page.getByTestId('parent')).toHaveSelection('selected')
   *
   * // selection that applies from prev all, parent text before child, and part child.
   * range.setStart(page.getByTestId('prev').element(), 0)
   * range.setEnd(page.getByTestId('child').element().childNodes[0], 3)
   * await expect.element(page.queryByTestId('prev')).toHaveSelection('prev')
   * await expect.element(page.queryByTestId('child')).toHaveSelection('sel')
   * await expect.element(page.queryByTestId('parent')).toHaveSelection('text sel')
   * await expect.element(page.queryByTestId('next')).not.toHaveSelection()
   *
   * // selection that applies from part child, parent text after child and part next.
   * range.setStart(page.getByTestId('child').element().childNodes[0], 3)
   * range.setEnd(page.getByTestId('next').element().childNodes[0], 2)
   * await expect.element(page.queryByTestId('child')).toHaveSelection('ected')
   * await expect.element(page.queryByTestId('parent')).toHaveSelection('ected text')
   * await expect.element(page.queryByTestId('prev')).not.toHaveSelection()
   * await expect.element(page.queryByTestId('next')).toHaveSelection('ne')
   *
   * @see https://vitest.dev/api/browser/assertions#tohaveselection
   */
  toHaveSelection(selection?: string): R

  /**
   * @description
   * This assertion allows you to perform visual regression testing by comparing
   * screenshots of elements or pages against stored reference images.
   *
   * When differences are detected beyond the configured threshold, the test fails.
   * To help identify the changes, the assertion generates:
   *
   * - The actual screenshot captured during the test
   * - The expected reference screenshot
   * - A diff image highlighting the differences (when possible)
   *
   * @example
   * <button data-testid="button">Fancy Button</button>
   *
   * // basic usage, auto-generates screenshot name
   * await expect.element(getByTestId('button')).toMatchScreenshot()
   *
   * // with custom name
   * await expect.element(getByTestId('button')).toMatchScreenshot('fancy-button')
   *
   * // with options
   * await expect.element(getByTestId('button')).toMatchScreenshot({
   *   comparatorName: 'pixelmatch',
   *   comparatorOptions: {
   *     allowedMismatchedPixelRatio: 0.01,
   *   },
   * })
   *
   * // with both name and options
   * await expect.element(getByTestId('button')).toMatchScreenshot('fancy-button', {
   *   comparatorName: 'pixelmatch',
   *   comparatorOptions: {
   *     allowedMismatchedPixelRatio: 0.01,
   *   },
   * })
   *
   * @see https://vitest.dev/api/browser/assertions#tomatchscreenshot
   */
  toMatchScreenshot<ComparatorName extends keyof ScreenshotComparatorRegistry>(
    options?: ScreenshotMatcherOptions<ComparatorName>,
  ): Promise<R>
  toMatchScreenshot<ComparatorName extends keyof ScreenshotComparatorRegistry>(
    name?: string,
    options?: ScreenshotMatcherOptions<ComparatorName>,
  ): Promise<R>
}
