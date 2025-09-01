// Sample data for the form template
const defaultFormData = {
    formTitle: "Contact Us Form",
    formDescription: "Please fill out this form to get in touch with us. We'll respond within 24 hours.",
    formDescriptionMetadata: "Contact form for customer inquiries and support requests",
    buttonLabel: "Submit Form",
    testRun: true,
    appendAttribution: true,
    n8nWebsiteLink: "https://n8n.io",
    useResponseData: false,
    
    // Sample form fields demonstrating different input types
    formFields: [
        {
            id: "fullName",
            label: "Full Name",
            type: "text",
            placeholder: "Enter your full name",
            defaultValue: "",
            isInput: true,
            inputRequired: "form-required",
            errorId: "error-fullName"
        },
        {
            id: "email",
            label: "Email Address",
            type: "email",
            placeholder: "Enter your email address",
            defaultValue: "",
            isInput: true,
            inputRequired: "form-required",
            errorId: "error-email"
        },
        {
            id: "phone",
            label: "Phone Number",
            type: "tel",
            placeholder: "Enter your phone number",
            defaultValue: "",
            isInput: true,
            inputRequired: "",
            errorId: "error-phone"
        },
        {
            id: "message",
            label: "Message",
            placeholder: "Tell us how we can help you...",
            defaultValue: "",
            isTextarea: true,
            inputRequired: "form-required",
            errorId: "error-message"
        },
        {
            id: "priority",
            label: "Priority Level",
            isSelect: true,
            selectOptions: ["Low", "Medium", "High", "Urgent"],
            inputRequired: "form-required",
            errorId: "error-priority"
        },
        {
            id: "contactMethod",
            label: "Preferred Contact Method",
            isMultiSelect: true,
            radioSelect: true,
            inputRequired: "form-required",
            errorId: "error-contactMethod",
            multiSelectOptions: [
                { id: "contact-email", label: "Email" },
                { id: "contact-phone", label: "Phone" },
                { id: "contact-sms", label: "SMS" }
            ]
        },
        {
            id: "services",
            label: "Services Interested In",
            isMultiSelect: true,
            radioSelect: false,
            minSelectedOptions: 1,
            maxSelectedOptions: 3,
            inputRequired: "",
            errorId: "error-services",
            multiSelectOptions: [
                { id: "service-web", label: "Web Development" },
                { id: "service-mobile", label: "Mobile Apps" },
                { id: "service-consulting", label: "Consulting" },
                { id: "service-support", label: "Technical Support" }
            ]
        },
        {
            id: "attachment",
            label: "Attach File (Optional)",
            isFileInput: true,
            acceptFileTypes: ".pdf,.doc,.docx,.txt",
            multipleFiles: "",
            placeholder: "Choose file...",
            inputRequired: "",
            errorId: "error-attachment"
        },
        {
            id: "termsAccepted",
            label: "I agree to the terms and conditions",
            isMultiSelect: true,
            radioSelect: false,
            exactSelectedOptions: 1,
            inputRequired: "form-required",
            errorId: "error-termsAccepted",
            multiSelectOptions: [
                { id: "terms-checkbox", label: "Yes, I agree to the terms and conditions" }
            ]
        },
        {
            id: "welcomeMessage",
            isHtml: true,
            html: "<h3>Welcome!</h3><p>Thank you for your interest in our services. Please fill out the form below and we'll get back to you as soon as possible.</p><ul><li>Response time: 24 hours</li><li>Available Monday-Friday</li><li>Emergency support available</li></ul>"
        },
        {
            id: "hiddenField",
            isHidden: true,
            hiddenValue: "contact-form-v1.2"
        }
    ],
    
    formSubmittedHeader: "Thank You!",
    formSubmittedText: "Your message has been received. We'll get back to you within 24 hours.",
    
    // Custom CSS for styling (optional)
    dangerousCustomCss: `
        .container {
            max-width: 600px;
        }
        .form-header h1 {
            color: #2c3e50;
        }
        .form-header p {
            color: #7f8c8d;
        }
    `
};

// Make data available globally
window.defaultFormData = defaultFormData;
