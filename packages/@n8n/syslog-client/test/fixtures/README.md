# Test Fixtures

This directory contains test certificates for TLS testing.

## Required Files

These files can be regenerated using the following commands:

- `key.pem` - Private key for test TLS server
- `certificate.pem` - Valid certificate for test TLS server
- `wrong.pem` - Invalid certificate for testing certificate validation

## Generate Test Certificates

You can generate self-signed test certificates using OpenSSL:

```bash
# Generate private key
openssl genrsa -out key.pem 2048

# Generate valid certificate
openssl req -new -x509 -key key.pem -out certificate.pem -days 10000 \
  -subj "/C=US/ST=Test/L=Test/O=Test/CN=localhost"

# Generate wrong certificate (different key)
openssl genrsa -out wrong-key.pem 2048
openssl req -new -x509 -key wrong-key.pem -out wrong.pem -days 10000 \
  -subj "/C=US/ST=Wrong/L=Wrong/O=Wrong/CN=wrong"
rm wrong-key.pem
```

These certificates are only for testing and should never be used in production.
