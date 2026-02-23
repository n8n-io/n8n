// Auto-login to n8n and print the auth cookie
// Usage: node auto-login.js [email] [password]
// Example: node auto-login.js test@gmail.com "N!12345678"

const http = require('http');

const email = process.argv[2] || 'test@gmail.com';
const password = process.argv[3] || 'N!12345678';
const baseUrl = 'http://localhost:5678';

const postData = JSON.stringify({ emailOrLdapLoginId: email, password });

const req = http.request(
  `${baseUrl}/rest/login`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  },
  (res) => {
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const authCookie = cookies.find((c) => c.startsWith('n8n-auth='));
      if (authCookie) {
        const token = authCookie.split('=')[1].split(';')[0];
        console.log('\n✅ Login successful!\n');
        console.log('Open this URL in your browser to auto-login:');
        console.log(`${baseUrl}/workflows`);
        console.log('\nOr paste this cookie in browser DevTools (Application > Cookies):');
        console.log(`  Name:  n8n-auth`);
        console.log(`  Value: ${token}`);
        console.log(`  Path:  /`);
      }
    } else {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        console.error('Login failed:', res.statusCode, body);
      });
    }
  },
);

req.on('error', (e) => console.error('Error:', e.message));
req.write(postData);
req.end();
