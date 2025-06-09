# n8n-nodes-pdfco

This is an n8n community node that enables you to integrate PDF.co's powerful PDF processing capabilities into your n8n workflows. PDF.co is a comprehensive PDF processing API that allows you to convert, merge, split, and manipulate PDF documents programmatically.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Usage](#usage)  
[Resources](#resources)  
[Version history](#version-history)  

## Installation
### Community Nodes (Recommended)
For users on n8n v0.187+, you can install this node directly from the n8n Community Nodes panel in the n8n editor:

1. Open your n8n editor
2. Go to Settings > Community Nodes
3. Search for "n8n-nodes-pdfco"
4. Click Install
5. Reload the editor

### Manual Installation
You can also install this node manually:

1. Navigate to your n8n installation directory
2. Run the following command:
```bash
npm install n8n-nodes-pdfco
```
3. Restart your n8n server


## Operations

This node provides comprehensive PDF processing capabilities through PDF.co's API. Here are the available features:

### 1. AI-Powered Document Processing
- AI Invoice Parser: Extract data from invoices using AI-powered parsing

### 2. URL/HTML to PDF Conversion
- URL to PDF
- HTML to PDF
- HTML Template to PDF

### 3. PDF Merging
- Merge multiple PDFs into one
- Support for merging from different file formats (merge2)

### 4. PDF Splitting
- Split by page number
- Split by search text
- Split by barcode

### 5. Document to PDF Conversion
- Document to PDF (RTF, DOC, DOCX, TXT)
- Spreadsheet to PDF (CSV, XLS, XLSX, TXT Spreadsheet)
- Image to PDF (JPG, PNG, TIFF)
- Email to PDF (MSG or EML)

### 6. PDF to Other Formats
- PDF to CSV
- PDF to HTML
- PDF to Images (JPG, PNG, TIFF, WEBP)
- PDF to JSON
- PDF to Text
- PDF to Excel (XLS/XLSX)
- PDF to XML

### 7. PDF Modification
- Add text annotations
- Add images to PDF documents
- Fill interactive PDF forms with data
- Extract PDF metadata
- Get form field information

### 8. PDF Optimization
- Compress PDF files
- Optimize PDF for web or storage
- Remove password protection
- Add password protection
- Rotate pages in PDF documents
- Remove specific pages from PDF

### 9. PDF Search and Text Operations
- Search for text within PDF documents
- Search and delete text
- Search and replace text
- Search and replace with image

### 10. Barcode Operations
- Extract barcode data from PDFs
- Generate barcodes in PDFs

### 11. PDF OCR and Searchability
- Make scanned PDF searchable (OCR)
- Make searchable PDF unsearchable

### 12. File Management
- Standard file upload
- Create file URL from input text/content
- Upload from Base64 encoded data

## Credentials

To use this node, you need a PDF.co API key. Here's how to get started:

1. Sign up for a PDF.co account at [https://pdf.co](https://pdf.co)
2. Navigate to your dashboard and obtain your API key
3. In n8n, add your PDF.co credentials by providing your API key

## Usage

This node allows you to automate PDF processing tasks in your n8n workflows. Here are some common use cases:

- Process invoices using AI-powered parsing
- Automatically convert HTML reports to PDF
- Merge multiple PDF documents into a single file
- Extract text from PDF documents for data processing
- Add watermarks to PDF documents
- Compress PDF files to reduce size
- Secure PDFs with password protection
- Convert various document formats to PDF
- Extract data from PDFs to other formats
- Manage and modify PDF documents programmatically

For detailed examples and workflow templates, visit our [documentation](https://developer.pdf.co).

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [PDF.co API Documentation](https://developer.pdf.co)
* [PDF.co Pricing](https://app.pdf.co/subscriptions)

## Version history

### 1.0.0
- Initial release with comprehensive PDF processing capabilities
- Full integration with PDF.co API services
- Support for all core PDF operations including conversion, merging, and modification

### 1.0.1
- Enhanced documentation with improved installation and usage instructions

### 1.0.2
- Improved code stability and performance
- Enhanced error handling and response management

### 1.0.3
- Improved code stability and performance
