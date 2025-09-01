// Main application logic for client-side Handlebars rendering

class HandlebarsApp {
    constructor() {
        this.template = null;
        this.currentData = null;
        this.renderMode = 'iframe'; // 'iframe' or 'inline'
        this.init();
    }

    async init() {
        await this.loadTemplate();
        this.setupEventListeners();
        this.setupMessageListener();
        this.loadInitialData();
        this.renderTemplate();
        this.showStatus('Ready!', 'success');
        console.log('Handlebars App initialized successfully');
    }

    async loadTemplate() {
        try {
            const response = await fetch('form-trigger.handlebars');
            const templateSource = await response.text();
            this.template = Handlebars.compile(templateSource);
            console.log('Template loaded successfully');
        } catch (error) {
            console.error('Error loading template:', error);
            this.showStatus('Error loading template', 'error');
        }
    }

    setupEventListeners() {
        const renderBtn = document.getElementById('renderBtn');
        const formDataEditor = document.getElementById('formDataEditor');
        const sendFocusBtn = document.getElementById('sendFocusBtn');
        const elementIdInput = document.getElementById('elementIdInput');

        renderBtn.addEventListener('click', () => {
            this.renderFromEditor();
        });

        sendFocusBtn.addEventListener('click', () => {
            this.sendFocusToIframe();
        });

        // Auto-render on Ctrl+Enter
        formDataEditor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.renderFromEditor();
            }
        });

        // Send focus on Enter in element ID input
        elementIdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendFocusToIframe();
            }
        });

        // Auto-save to localStorage
        formDataEditor.addEventListener('input', () => {
            localStorage.setItem('handlebars-form-data', formDataEditor.value);
        });
    }

    setupMessageListener() {
        // Listen for messages from iframe
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'elementFocused') {
                const { elementId, success, error } = event.data;
                
                if (success) {
                    this.showStatus(`✅ Element "${elementId}" focused successfully`, 'success');
                } else {
                    this.showStatus(`❌ Element "${elementId}" not found: ${error}`, 'error');
                }
            }
        });
    }

    sendFocusToIframe() {
        const elementIdInput = document.getElementById('elementIdInput');
        const elementId = elementIdInput.value.trim();
        
        if (!elementId) {
            this.showStatus('Please enter an element ID', 'error');
            return;
        }

        const iframe = document.getElementById('formIframe');
        if (!iframe || !iframe.contentWindow) {
            this.showStatus('Iframe not available', 'error');
            return;
        }

        // Send message to iframe
        iframe.contentWindow.postMessage({
            type: 'focusElement',
            elementId: elementId
        }, '*');

        this.showStatus(`Focus command sent to element: ${elementId}`, 'success');
        console.log(`Sent focus command for element: ${elementId}`);
    }

    toggleRenderMode() {
        const renderModeToggle = document.getElementById('renderModeToggle');
        const renderedOutput = document.getElementById('renderedOutput');
        
        if (this.renderMode === 'iframe') {
            this.renderMode = 'inline';
            renderModeToggle.textContent = 'Inline Mode';
            renderModeToggle.classList.remove('active');
            renderedOutput.innerHTML = '<!-- Rendered template will appear here -->';
        } else {
            this.renderMode = 'iframe';
            renderModeToggle.textContent = 'Iframe Mode';
            renderModeToggle.classList.add('active');
            renderedOutput.innerHTML = `
                <div class="iframe-container">
                    <div class="iframe-overlay">Form Preview</div>
                    <iframe id="formIframe" class="form-iframe" src="about:blank"></iframe>
                </div>
            `;
        }
        
        // Re-render with new mode
        this.renderTemplate();
    }

    loadInitialData() {
        const formDataEditor = document.getElementById('formDataEditor');
        
        // Try to load from localStorage first
        const savedData = localStorage.getItem('handlebars-form-data');
        if (savedData) {
            formDataEditor.value = savedData;
            try {
                this.currentData = JSON.parse(savedData);
                return;
            } catch (e) {
                console.warn('Invalid JSON in localStorage, using default data');
            }
        }

        // Use default data
        this.currentData = window.defaultFormData;
        formDataEditor.value = JSON.stringify(this.currentData, null, 2);
    }

    renderFromEditor() {
        const formDataEditor = document.getElementById('formDataEditor');
        const jsonText = formDataEditor.value.trim();

        if (!jsonText) {
            this.showStatus('Please enter form data', 'error');
            return;
        }

        try {
            const data = JSON.parse(jsonText);
            this.currentData = data;
            this.renderTemplate();
            this.showStatus('Template rendered successfully!', 'success');
        } catch (error) {
            console.error('JSON Parse Error:', error);
            this.showStatus(`JSON Error: ${error.message}`, 'error');
        }
    }

    renderTemplate() {
        if (!this.template || !this.currentData) {
            this.showStatus('Template or data not ready', 'error');
            return;
        }

        try {
            const html = this.template(this.currentData);
            
            if (this.renderMode === 'iframe') {
                this.renderInIframe(html);
            } else {
                this.renderInline(html);
            }
            
        } catch (error) {
            console.error('Template Render Error:', error);
            this.showStatus(`Render Error: ${error.message}`, 'error');
        }
    }

    renderInIframe(html) {
        const iframe = document.getElementById('formIframe');
        if (!iframe) {
            this.showStatus('Iframe not found', 'error');
            return;
        }

        // Create a complete HTML document for the iframe
        const iframeDocument = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Form Preview</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    .highlight-element {
                        animation: highlight-pulse 2s ease-in-out;
                        box-shadow: 0 0 10px 3px rgba(255, 193, 7, 0.5) !important;
                        border-color: #ffc107 !important;
                    }
                    @keyframes highlight-pulse {
                        0% { box-shadow: 0 0 5px 2px rgba(255, 193, 7, 0.8); }
                        50% { box-shadow: 0 0 15px 5px rgba(255, 193, 7, 0.4); }
                        100% { box-shadow: 0 0 10px 3px rgba(255, 193, 7, 0.5); }
                    }
                </style>
            </head>
            <body>
                ${html}
                <script>
                    // Listen for focus messages from parent window
                    window.addEventListener('message', function(event) {
                        if (event.data && event.data.type === 'focusElement') {
                            const elementId = event.data.elementId;
                            const element = document.getElementById(elementId);
                            
                            if (element) {
                                // Clear previous highlights
                                document.querySelectorAll('.highlight-element').forEach(el => {
                                    el.classList.remove('highlight-element');
                                });
                                
                                // Focus and highlight the element
                                element.focus();
                                element.classList.add('highlight-element');
                                
                                // Scroll element into view
                                element.scrollIntoView({ 
                                    behavior: 'smooth', 
                                    block: 'center' 
                                });
                                
                                // Remove highlight after animation
                                setTimeout(() => {
                                    element.classList.remove('highlight-element');
                                }, 2000);
                                
                                console.log('Focused element:', elementId);
                                
                                // Send confirmation back to parent
                                window.parent.postMessage({
                                    type: 'elementFocused',
                                    elementId: elementId,
                                    success: true
                                }, '*');
                            } else {
                                console.warn('Element not found:', elementId);
                                
                                // Send error back to parent
                                window.parent.postMessage({
                                    type: 'elementFocused',
                                    elementId: elementId,
                                    success: false,
                                    error: 'Element not found'
                                }, '*');
                            }
                        }
                    });
                    
                    console.log('Iframe message listener initialized');
                </script>
            </body>
            </html>
        `;

        // Write the HTML to the iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(iframeDocument);
        iframeDoc.close();

        // Wait for iframe to load, then initialize form
        iframe.onload = () => {
            this.initializeIframeForm(iframe);
        };
    }

    renderInline(html) {
        document.getElementById('renderedOutput').innerHTML = html;
        // Re-initialize any form scripts in the rendered content
        this.initializeRenderedForm();
    }

    initializeRenderedForm() {
        // The rendered form contains its own JavaScript
        // We need to re-execute some of the form initialization code
        // since it was designed to run on page load
        
        try {
            // Re-run number input wheel prevention
            document.querySelectorAll("input[type=number]").forEach(function (element) {
                element.addEventListener("wheel", function(event) {
                    if (document.activeElement === event.target) {
                        event.preventDefault();
                    }
                });
            });

            // Re-run file input clear button logic
            document.querySelectorAll('input[type="file"]').forEach(fileInput => {
                const clearButton = fileInput.nextElementSibling;
                if (!clearButton || !clearButton.classList.contains('clear-button')) return;
                
                let previousFiles = [];

                // Remove existing listeners by cloning the elements
                const newFileInput = fileInput.cloneNode(true);
                const newClearButton = clearButton.cloneNode(true);
                fileInput.parentNode.replaceChild(newFileInput, fileInput);
                clearButton.parentNode.replaceChild(newClearButton, clearButton);

                newFileInput.addEventListener('change', () => {
                    const files = newFileInput.files;
                    if (files.length > 0) {
                        previousFiles = Array.from(files);
                        newClearButton.style.display = 'inline-block';
                    }
                });

                newClearButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    newFileInput.value = '';
                    previousFiles = [];
                    newClearButton.style.display = 'none';
                });
            });

            console.log('Form initialized successfully');
        } catch (error) {
            console.warn('Error initializing form:', error);
        }
    }

    initializeIframeForm(iframe) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const iframeWindow = iframe.contentWindow;

            // The form HTML already contains the complete JavaScript
            // The iframe will execute the scripts automatically
            // We just need to make sure the form is functional

            // Add some debugging to the iframe console
            if (iframeWindow.console) {
                iframeWindow.console.log('Form initialized in iframe');
            }

            // Optionally, we could add a message listener to communicate with the iframe
            iframeWindow.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'form-submit') {
                    console.log('Form submitted in iframe:', event.data);
                    this.showStatus('Form submitted successfully!', 'success');
                }
            });

        } catch (error) {
            console.warn('Error initializing iframe form:', error);
        }
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        
        // Clear status after 3 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'status';
            }, 3000);
        }
    }

    // Method to update data programmatically
    updateData(newData) {
        this.currentData = { ...this.currentData, ...newData };
        document.getElementById('formDataEditor').value = JSON.stringify(this.currentData, null, 2);
        this.renderTemplate();
    }

    // Method to reset to default data
    resetToDefault() {
        this.currentData = window.defaultFormData;
        document.getElementById('formDataEditor').value = JSON.stringify(this.currentData, null, 2);
        localStorage.removeItem('handlebars-form-data');
        this.renderTemplate();
        this.showStatus('Reset to default data', 'success');
    }
}

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HandlebarsApp();
});

// Expose some helpful functions globally for debugging
window.renderTemplate = () => window.app?.renderFromEditor();
window.resetData = () => window.app?.resetToDefault();

// Hot reload detection (simple approach)
let lastModified = Date.now();
setInterval(async () => {
    try {
        const response = await fetch('form-trigger.handlebars', { method: 'HEAD' });
        const modified = new Date(response.headers.get('last-modified')).getTime();
        if (modified > lastModified) {
            lastModified = modified;
            console.log('Template file changed, reloading...');
            await window.app.loadTemplate();
            window.app.renderTemplate();
            window.app.showStatus('Template reloaded!', 'success');
        }
    } catch (error) {
        // Silently ignore errors in hot reload check
    }
}, 1000);
