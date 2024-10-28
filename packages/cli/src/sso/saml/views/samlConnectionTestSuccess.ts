import type { SamlUserAttributes } from '../types/samlUserAttributes';

export function getSamlConnectionTestSuccessView(attributes: SamlUserAttributes): string {
	return `
    <http>
    <head>
    <title>n8n - SAML Connection Test Result</title>
    <style>
        body { background: rgb(251,252,254); font-family: 'Open Sans', sans-serif; padding: 10px; margin: auto; width: 500px; top: 40%; position: relative; }
        h1 { color: rgb(0, 0, 0); font-size: 16px; font-weight: 400; margin: 0 0 10px 0; }
        h2 { color: rgb(0, 0, 0); font-size: 12px; font-weight: 400; margin: 0 0 10px 0; }
        button { border: 1px solid rgb(219, 223, 231); background: rgb(255, 255, 255); border-radius: 4px; padding: 10px; }
        ul { border: 1px solid rgb(219, 223, 231); border-radius: 4px; padding: 10px; }
        li { decoration: none; list-style: none; margin: 0 0 0px 0; color: rgb(125, 125, 125); font-size: 12px;}
    </style>
    </head>
    <body>
    <div style="text-align:center">
    <h1>SAML Connection Test was successful</h1>
    <button onclick="window.close()">You can close this window now</button>
    <p></p>
    <h2>Here are the attributes returned by your SAML IdP:</h2>
    <ul>
    <li><strong>Email:</strong> ${attributes.email ?? '(n/a)'}</li>
    <li><strong>First Name:</strong> ${attributes.firstName ?? '(n/a)'}</li>
    <li><strong>Last Name:</strong> ${attributes.lastName ?? '(n/a)'}</li>
    <li><strong>UPN:</strong> ${attributes.userPrincipalName ?? '(n/a)'}</li>
    </ul>
    </div>
    </body>
    </http>
	`;
}
