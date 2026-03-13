# Syslog Manual Testing

Please note: You will need an enterprise licence in n8n to configure this.

## With TCP

### Step 1 - Configure and start syslog-ng

Create a new directory to contain your syslog config (doesn't have to be the home dir):

```sh
mkdir -p ~/syslog-tcp-test && cd ~/syslog-tcp-test
```

Create a file `syslog-ng.conf` and paste the following content:

```
@version: 4.10
@include "scl.conf"

source s_tcp {
  network(
    transport("tcp")
    port(514)
    flags(no-parse)
  );
};

destination d_console {
  file("/proc/1/fd/1" template("RECEIVED: $MSG\n"));
};

log {
  source(s_tcp);
  destination(d_console);
  flags(flow-control);
};
```

Start a local instance with docker and validate it is working

```shell
docker run -d \
  --name syslog-ng-tcp \
  -p 514:514 \
  -v $(pwd)/syslog-ng.conf:/etc/syslog-ng/syslog-ng.conf:ro \
  balabit/syslog-ng:latest

# In one window
docker logs -f syslog-ng-tcp

# In another window
echo "test message" | nc -v localhost 514

# You should see the message in the window tailing the logs
```

### Step 2 - Configure log streaming in n8n
Head to n8n log streaming settings and enter the following:
```
Host: localhost
Port: 514
Protocol: TCP
Facility: Local0
App Name: n8n
```
Once saved you can send a test message and validate it is received using the `docker logs syslog-ng-tcp` command.

## With TLS

These instructions will help you setup a syslog server that will accept TLS connections. They will be useful if you need
to manually validate anything specific around TLS & syslog configuration.

### Step 1 - Setup Test Certs
```shell
mkdir -p ~/syslog-tls-test && cd ~/syslog-tls-test

# CA certificate
openssl req -x509 -newkey rsa:4096 \
-keyout ca-key.pem \
-out ca-cert.pem \
-days 365 -nodes \
-subj "/CN=Test CA/O=Test Org"

# Server key
openssl genrsa -out server-key.pem 4096

# Server certificate signing request
openssl req -new \
-key server-key.pem \
-out server-csr.pem \
-subj "/CN=localhost/O=Test Server"

# Sign server certificate using CA
openssl x509 -req \
-in server-csr.pem \
-CA ca-cert.pem \
-CAkey ca-key.pem \
-CAcreateserial \
-out server-cert.pem \
-days 365 \
-sha256
```

### Step 2 - Configure and start syslog-ng
Create a file `syslog-ng.conf` and paste the following content:

```
@version: 4.10
@include "scl.conf"

source s_tls {
  network(
   transport("tls")
   port(6514)
   flags(no-parse)
   tls(
     key-file("/certs/server-key.pem")
     cert-file("/certs/server-cert.pem")
     peer-verify(optional-untrusted)
   )
  );
};

destination d_console {
  file("/proc/1/fd/1" template("RECEIVED: $MSG\n"));
};

log {
  source(s_tls);
  destination(d_console);
  flags(flow-control);
};
```

Start a local instance with docker and validate it is working

```shell
docker run -d \
--name syslog-ng-tls \
-p 6514:6514 \
-v $(pwd)/ca-cert.pem:/certs/ca-cert.pem:ro \
-v $(pwd)/server-cert.pem:/certs/server-cert.pem:ro \
-v $(pwd)/server-key.pem:/certs/server-key.pem:ro \
-v $(pwd)/syslog-ng.conf:/etc/syslog-ng/syslog-ng.conf:ro \
balabit/syslog-ng:latest

# In one window
docker logs -f syslog-ng-tls

# In another window
echo 'TEST MESSAGE' | \
    openssl s_client -connect localhost:6514 -CAfile ca-cert.pem -ign_eof 2>&1

# You should see the message in the window tailing the logs
```

### Step 3 - Configure log streaming in n8n
Head to n8n log streaming settings and enter the following:
```
Host: localhost // This is important as the certificate CN=localhost
Port: 6514
Protocol: TLS
TlsCa: Paste the contents of ca-cert.pem created in step 1
Facility: Local0
App Name: n8n
```
Once saved you can send a test message and validate it is received using the `docker logs syslog-ng-tls` command.

Most problems result in a log in the n8n system - error feedback will hopefully be improved in  
