**Cross-platform unique machine (desktop) id discovery**


## Use cases
- Software restrictions
- Installation tracking

## Features
- Hardware independent
- Unique within the OS installation
- No elevated rights required
- No external dependencies and does not require any native bindings
- Cross-platform (OSx, Win, Linux)

## How it works

Module based on OS native UUID/GUID which used for internal needs.

**All others approaches requires elevated rights or much depends on hardware components, but this approach summarize the methods of selecting the most reliable unique identifier**

- **Win32/64** uses key ```MachineGuid``` in registry
```HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography``` **(can be changed by administrator but with unpredictable consequences)**
>   It is generated during OS installation and won't change unless you make another OS
>   updates or reinstall. Depending on the OS version it may contain the network adapter
>   MAC address embedded (plus some other numbers, including random), or a pseudorandom number.

- **OSx** uses ```IOPlatformUUID``` (the same Hardware UUID)
``` ioreg -rd1 -c IOPlatformExpertDevice ```
>   Value from I/O Kit registry in IOPlatformExpertDevice class

- **Linux** uses ```/var/lib/dbus/machine-id``` **(can be changed by ```root``` but with unpredictable consequences)**
http://man7.org/linux/man-pages/man5/machine-id.5.html
>   The /var/lib/dbus/machine-id file contains the unique machine ID of the local
>   system that is set during installation. The machine ID is a single
>   newline-terminated, hexadecimal, 32-character, lowercase machine ID
>   string. When decoded from hexadecimal, this corresponds with a
>   16-byte/128-bit string.
>
>   The machine ID is usually generated from a random source during
>   system installation and stays constant for all subsequent boots.
>   Optionally, for stateless systems, it is generated during runtime at
>   early boot if it is found to be empty.
>
>   The machine ID does not change based on user configuration or when
>   hardware is replaced.


## Installation
```
npm install node-machine-id
```

## Usage
### Function: machineId(original)
- **original** ```<Boolean>```, If ```true``` return original value of machine id, otherwise return hashed value (sha-256), default: ```false```

### Function: machineIdSync(original);
- syncronous version of ```machineId```

```js
import {machineId, machineIdSync} from 'node-machine-id';

// Asyncronous call with async/await or Promise

async function getMachineId() {
    let id = await machineId();
    ...
}

machineId().then((id) => {
    ...
})

// Syncronous call

let id = machineIdSync()
// id = c24b0fe51856497eebb6a2bfcd120247aac0d6334d670bb92e09a00ce8169365
let id = machineIdSync({original: true})
// id = 98912984-c4e9-5ceb-8000-03882a0485e4
```
### Caveats

- Image-based environments have usually the same `machine-id`
> As a workaround you can generate new machine-ids for each instance (or container) with `dbus-uuidgen` and changed them in the respective > files: `/etc/machine-id` and `/var/lib/dbus/machine-id`. Thanks [@stefanhuber](https://github.com/stefanhuber)
