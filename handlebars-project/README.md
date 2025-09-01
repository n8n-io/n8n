# Handlebars Client-Side Renderer

A simple JavaScript project that renders HTML pages using Handlebars templates with hot reload functionality. This project specifically renders the `form-trigger.handlebars` template with customizable form data.

## Features

- 🔄 **Hot Reload**: Automatically reloads when template files change
- 🎨 **Live Editing**: Edit form data in JSON format and see changes instantly
- 🎯 **Element Highlighting**: Focus and highlight specific form elements by ID
- 📱 **Responsive**: Works on desktop and mobile devices
- 🚀 **Client-Side Only**: No server-side processing required
- 💾 **Auto-Save**: Form data is automatically saved to localStorage
- 🖼️ **Iframe Rendering**: Form renders in isolated iframe for better testing

## Getting Started

### Prerequisites

- Node.js (for the development server)
- A modern web browser

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

### Alternative Start Method

If you just want to start the server without auto-opening:
```bash
npm start
```

## Usage

1. **Edit Form Data**: Modify the JSON data in the textarea to customize the form
2. **Render Template**: Click "Render Template" or press `Ctrl+Enter` to update the rendered form
3. **Highlight Elements**: Use the "Highlight Field" section to focus specific form elements by ID
4. **Hot Reload**: The template will automatically reload when you modify `form-trigger.handlebars`

### Using the Highlight Field Feature

1. Enter a form field ID in the "Highlight Field" input (e.g., `fullName`, `email`, `message`)
2. Click "Send" or press `Enter` to focus that element in the iframe
3. The element will be highlighted with a yellow glow and scrolled into view
4. Status messages will confirm if the element was found or not

### Sample Form Data Structure

The form data includes:

- **Basic Info**: `formTitle`, `formDescription`, `buttonLabel`
- **Form Fields**: Array of field objects with different types:
  - Text inputs
  - Email inputs
  - Textareas
  - Select dropdowns
  - Multi-select checkboxes/radio buttons
  - File uploads
  - HTML content blocks
  - Hidden fields

### Form Field Types

Each field in the `formFields` array can have these properties:

```javascript
{
  id: "fieldId",
  label: "Field Label",
  type: "text|email|tel|number|date",
  placeholder: "Placeholder text",
  defaultValue: "Default value",
  inputRequired: "form-required", // or ""
  errorId: "error-fieldId",
  
  // For different field types:
  isInput: true,        // Regular input fields
  isTextarea: true,     // Textarea fields
  isSelect: true,       // Dropdown select
  isMultiSelect: true,  // Checkbox/radio groups
  isFileInput: true,    // File upload
  isHtml: true,        // HTML content
  isHidden: true       // Hidden fields
}
```

## File Structure

```
handlebars-project/
├── index.html              # Main HTML file
├── app.js                  # Application logic
├── data.js                 # Sample form data
├── form-trigger.handlebars # Handlebars template
├── package.json            # Project configuration
└── README.md              # This file
```

## Development

### Hot Reload

The project includes two types of hot reload:

1. **Live Server**: Reloads the entire page when any file changes
2. **Template Hot Reload**: Automatically reloads just the Handlebars template when it changes

### Debugging

Open browser developer tools to see console logs. The app exposes these global functions for debugging:

- `renderTemplate()`: Re-render the current template
- `resetData()`: Reset form data to defaults
- `window.app`: Access the main application instance

### Customization

- **Styling**: Modify the CSS in `index.html` or add custom CSS in the form data
- **Template**: Edit `form-trigger.handlebars` to change the form structure
- **Data**: Modify `data.js` to change default form configuration

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### Template Not Loading
- Ensure `form-trigger.handlebars` exists in the project directory
- Check browser console for fetch errors
- Verify the development server is running

### JSON Parse Errors
- Validate your JSON syntax in the textarea
- Use online JSON validators if needed
- Check browser console for specific error messages

### Hot Reload Not Working
- Ensure live-server is installed: `npm install`
- Check that files are being watched correctly
- Try refreshing the page manually

## License

ISC
