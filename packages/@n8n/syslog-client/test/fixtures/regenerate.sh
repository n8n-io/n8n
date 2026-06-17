#!/usr/bin/env bash

# Generate valid certificate
openssl req -new -x509 -key key.pem -out certificate.pem -days 10000 \
  -subj "/C=US/ST=Test/L=Test/O=Test/CN=localhost"

# Generate wrong certificate (different key)
openssl genrsa -out wrong-key.pem 2048
openssl req -new -x509 -key wrong-key.pem -out wrong.pem -days 10000 \
  -subj "/C=US/ST=Wrong/L=Wrong/O=Wrong/CN=wrong"
rm wrong-key.pem
