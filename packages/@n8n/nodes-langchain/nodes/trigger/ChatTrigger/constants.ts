// CSS Variables are defined in `@n8n/chat/src/css/_tokens.scss`
export const cssVariables = `
:root {
  /* Colors */
  --chat--color-primary: #e74266;
  --chat--color-primary-shade-50: #db4061;
  --chat--color-primary-shade-100: #cf3c5c;
  --chat--color-secondary: #20b69e;
  --chat--color-secondary-shade-50: #1ca08a;
  --chat--color-white: #ffffff;
  --chat--color-light: #f2f4f8;
  --chat--color-light-shade-50: #e6e9f1;
  --chat--color-light-shade-100: #c2c5cc;
  --chat--color-medium: #d2d4d9;
  --chat--color-dark: #101330;
  --chat--color-disabled: #777980;
  --chat--color-typing: #404040;

  /* Base Layout */
  --chat--spacing: 1rem;
  --chat--border-radius: 0.25rem;
  --chat--transition-duration: 0.15s;
  --chat--font-family: (
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen-Sans,
    Ubuntu,
    Cantarell,
    'Helvetica Neue',
    sans-serif
  );

  /* Window Dimensions */
  --chat--window--width: 400px;
  --chat--window--height: 600px;
  --chat--window--bottom: var(--chat--spacing);
  --chat--window--right: var(--chat--spacing);
  --chat--window--z-index: 9999;
  --chat--window--border: 1px solid var(--chat--color-light-shade-50);
  --chat--window--border-radius: var(--chat--border-radius);
  --chat--window--margin-bottom: var(--chat--spacing);

  /* Header Styles */
  --chat--header-height: auto;
  --chat--header--padding: var(--chat--spacing);
  --chat--header--background: var(--chat--color-dark);
  --chat--header--color: var(--chat--color-light);
  --chat--header--border-top: none;
  --chat--header--border-bottom: none;
  --chat--header--border-left: none;
  --chat--header--border-right: none;
  --chat--heading--font-size: 2em;
  --chat--subtitle--font-size: inherit;
  --chat--subtitle--line-height: 1.8;

  /* Message Styles */
  --chat--message--font-size: 1rem;
  --chat--message--padding: var(--chat--spacing);
  --chat--message--border-radius: var(--chat--border-radius);
  --chat--message-line-height: 1.5;
  --chat--message--margin-bottom: calc(var(--chat--spacing) * 1);
  --chat--message--bot--background: var(--chat--color-white);
  --chat--message--bot--color: var(--chat--color-dark);
  --chat--message--bot--border: none;
  --chat--message--user--background: var(--chat--color-secondary);
  --chat--message--user--color: var(--chat--color-white);
  --chat--message--user--border: none;
  --chat--message--pre--background: rgba(0, 0, 0, 0.05);
  --chat--messages-list--padding: var(--chat--spacing);

  /* Toggle Button */
  --chat--toggle--size: 64px;
  --chat--toggle--width: var(--chat--toggle--size);
  --chat--toggle--height: var(--chat--toggle--size);
  --chat--toggle--border-radius: 50%;
  --chat--toggle--background: var(--chat--color-primary);
  --chat--toggle--hover--background: var(--chat--color-primary-shade-50);
  --chat--toggle--active--background: var(--chat--color-primary-shade-100);
  --chat--toggle--color: var(--chat--color-white);

  /* Input Area */
  --chat--textarea--height: 50px;
  --chat--textarea--max-height: 30rem;
  --chat--input--font-size: inherit;
  --chat--input--border: 0;
  --chat--input--border-radius: 0;
  --chat--input--padding: 0.8rem;
  --chat--input--background: var(--chat--color-white);
  --chat--input--text-color: initial;
  --chat--input--line-height: 1.5;
  --chat--input--placeholder--font-size: var(--chat--input--font-size);
  --chat--input--border-active: 0;
  --chat--input--left--panel--width: 2rem;

  /* Button Styles */
  --chat--button--color: var(--chat--color-light);
  --chat--button--background: var(--chat--color-primary);
  --chat--button--padding: calc(var(--chat--spacing) * 1 / 2) var(--chat--spacing);
  --chat--button--border-radius: var(--chat--border-radius);
  --chat--button--hover--color: var(--chat--color-light);
  --chat--button--hover--background: var(--chat--color-primary-shade-50);
  --chat--close--button--color-hover: var(--chat--color-primary);

  /* Send and File Buttons */
  --chat--input--send--button--background: var(--chat--color-white);
  --chat--input--send--button--color: var(--chat--color-light);
  --chat--input--send--button--background-hover: var(--chat--color-primary-shade-50);
  --chat--input--send--button--color-hover: var(--chat--color-secondary-shade-50);
  --chat--input--file--button--background: var(--chat--color-white);
  --chat--input--file--button--color: var(--chat--color-secondary);
  --chat--input--file--button--background-hover: var(--chat--input--file--button--background);
  --chat--input--file--button--color-hover: var(--chat--color-secondary-shade-50);
  --chat--files-spacing: 0.25rem;

  /* Body and Footer */
  --chat--body--background: var(--chat--color-light);
  --chat--footer--background: var(--chat--color-light);
  --chat--footer--color: var(--chat--color-dark);
}
`;
