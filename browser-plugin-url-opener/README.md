# 2nd Market Filter - Firefox Extension

A simple Firefox browser extension that opens the Esketit secondary market page with a single click.

## Features

- One-click access to https://esketit.com/investor/secondary-market
- EUR symbol icon for easy identification
- Lightweight and fast

## Installation

### Method 1: Temporary Installation (for testing)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on..."
4. Navigate to the `browser-plugin-url-opener` folder and select the `manifest.json` file
5. The extension will be loaded and the EUR icon will appear in your toolbar

Note: Temporary extensions are removed when Firefox is closed.

### Method 2: Permanent Installation (recommended)

To install permanently, you need to sign the extension through Mozilla:

1. Create a ZIP file of the extension:
   ```bash
   cd browser-plugin-url-opener
   zip -r ../2nd-market-filter.zip * -x "node_modules/*" "package*.json" "create-icons.html"
   ```

2. Create a developer account at https://addons.mozilla.org
3. Submit the extension for signing
4. Once approved, install the signed .xpi file

### Alternative: Developer Edition

For permanent local installation without signing:

1. Download Firefox Developer Edition or Nightly
2. Navigate to `about:config`
3. Set `xpinstall.signatures.required` to `false`
4. Follow Method 1 steps, but the extension will persist

## Usage

Once installed, simply click the EUR (€) icon in your Firefox toolbar. The extension will automatically open the Esketit secondary market page in a new tab.

## Files

- `manifest.json` - Extension configuration
- `background.js` - Background script that handles the click action
- `icons/icon.svg` - EUR symbol icon (SVG format)
- `create-icons.html` - Optional tool to generate PNG versions of the icon

## Customization

### Changing the URL

To change the target URL, edit `background.js` and modify the URL on line 4:

```javascript
url: "https://esketit.com/investor/secondary-market"
```

### Changing the Icon

Replace the `icons/icon.svg` file with your own SVG icon, or:

1. Open `create-icons.html` in a browser
2. Modify the icon design in the HTML file
3. Click the canvas images to download PNG versions
4. Update `manifest.json` to reference the PNG files

## License

ISC

## Support

For issues or questions, please contact the repository maintainer.
