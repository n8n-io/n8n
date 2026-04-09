// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
/**
 * Part of the {@link TSDocConfiguration} object.
 */
export class TSDocValidationConfiguration {
    constructor() {
        /**
         * Set `ignoreUndefinedTags` to true to silently ignore unrecognized tags,
         * instead of reporting a warning.
         *
         * @remarks
         * Normally the parser will issue errors when it encounters tag names that do not
         * have a corresponding definition in {@link TSDocConfiguration.tagDefinitions}.
         * This helps to catch common mistakes such as a misspelled tag.
         *
         * @defaultValue `false`
         */
        this.ignoreUndefinedTags = false;
        /**
         * Set `reportUnsupportedTags` to true to issue a warning for tags that are not
         * supported by your tool.
         *
         * @remarks
         * The TSDoc standard defines may tags.  By default it assumes that if your tool does
         * not implement one of these tags, then it will simply ignore it.  But sometimes this
         * may be misleading for developers. (For example, they might write an `@example` block
         * and then be surprised if it doesn't appear in the documentation output.).
         *
         * For a better experience, you can tell the parser which tags you support, and then it
         * will issue warnings wherever unsupported tags are used.  This is done using
         * {@link TSDocConfiguration.setSupportForTag}.  Note that calling that function
         * automatically sets `reportUnsupportedTags` to true.
         *
         * @defaultValue `false`
         */
        this.reportUnsupportedTags = false;
        /**
         * Set `reportUnsupportedHtmlElements` to true to issue a warning for HTML elements which
         * are not defined in your TSDoc configuration's `supportedHtmlElements` field.
         *
         * @defaultValue `false`
         */
        this.reportUnsupportedHtmlElements = false;
    }
}
//# sourceMappingURL=TSDocValidationConfiguration.js.map