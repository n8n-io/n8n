# Security

By default, n8n can be accessed by everybody. This is OK if you have it only running
locally but if you deploy it on a server which is accessible from the web you have
to make sure that n8n is protected!
Right now we have very basic protection via basic-auth in place. It can be activated
by setting the following environment variables:

```bash
export N8N_BASIC_AUTH_ACTIVE=true
export N8N_BASIC_AUTH_USER=<USER>
export N8N_BASIC_AUTH_PASSWORD=<PASSWORD>
```
