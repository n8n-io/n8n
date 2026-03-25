# SSH Remote Port Forward

> Allows the client to tunnel back to the host.

![Node.js CI](https://github.com/cristianrgreco/ssh-remote-port-forward/workflows/Node.js%20CI/badge.svg?branch=main)
[![npm version](https://badge.fury.io/js/ssh-remote-port-forward.svg)](https://www.npmjs.com/package/ssh-remote-port-forward)
[![npm version](https://img.shields.io/npm/dm/ssh-remote-port-forward.svg)](https://www.npmjs.com/package/ssh-remote-port-forward)

## Install

```bash
npm install --save ssh-remote-port-forward
```

## Usage

```typescript
import { 
  createSshConnection, 
  SshConnection, 
  ConnectConfig 
} from "ssh-remote-port-forward";

const connectConfig: ConnectConfig = {
  host: "example",
  port: "22",
};

const sshConnection: SshConnection = await createSshConnection(
  connectConfig
);

await sshConnection.remoteForward("localhost", 8000)
```