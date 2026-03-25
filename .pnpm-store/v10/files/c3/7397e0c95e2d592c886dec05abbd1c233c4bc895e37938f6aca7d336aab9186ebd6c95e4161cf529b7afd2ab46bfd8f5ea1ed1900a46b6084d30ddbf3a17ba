# SDK

The SDK provides a convenient way to work with license keys issued by the n8n license-server.

## Usage

```typescript
import {
  LicenseManager,
  TLicenseBlock,
} from '@n8n_io/license-sdk/src/LicenseManager'
import pino from 'pino'

// bring your own logger, e.g. Pino, Winston etc.
const myLogger = pino()

// ------ INITIALIZATION ------

const license = new LicenseManager({
  server: 'https://license.your-server.com',
  tenantId: 1, // referencing to resp. license-server entity
  productIdentifier: 'Demo Product v1.2.3', // must regex-match cert.productIdentifierPattern
  autoRenewEnabled: true,
  renewOnInit: false,
  autoRenewOffset: 60 * 60 * 48, // = 48 hours
  logger: myLogger,
  loadCertStr: async () => {
    // code that returns a stored cert string from DB
    return '...'
  },
  saveCertStr: async (cert: TLicenseBlock) => {
    // code that persists a cert string into the DB
    // ...
  },
  deviceFingerprint: () => 'a-unique-instance-id', //optional! If omitted, a machine-ID fingerprint will be generated
  onFeatureChange: () =>
    console.log('availability of some features has just changed'), //optional
  onLicenseRenewed: () => console.log('license was successfully renewed'), //optional
  onExpirySoon: () => console.log('license is about to expire'), //optional
  expirySoonOffsetMins: 180, //optional
})

// important! Attempts to load and initialize the cert:
await license.initialize()

// without a valid cert, no feature will be available:
if (license.hasFeatureEnabled('a-special-feature')) {
  // this code will never execute!
}

license.isValid() // -> false

license.getFeatureValue('another-feature') // -> undefined

license.getFeatures() // -> []

// ------ ACTIVATION ------

try {
  // download a license key by 'activating' a reservation.
  // Reservations are typically configured to be activatable only once.
  await license.activate('3fa85f64-5717-4562-b3fc-2c963f66afa6')

  license.isValid() // -> true

  license.getFeatureValue('foo') // -> 'bar'

  if (license.hasFeatureEnabled('a-feature-that-exists')) {
    //do stuff
  }

  const currentConsumption = getUsageFromSomewhere()

  if (license.hasQuotaLeft('quota:demoQuota', currentConsumption)) {
    //do stuff
  }

  // print a human-readable string representation.
  console.log(`${license}`)
} catch (e) {
  // handle error...
}

// ------ RENEWAL ------
// renewals happen automatically based on the config options `autoRenewEnabled` and `autoRenewOffset`
// but can also be enforced, as long as the current cert is not yet terminated:
await license.renew()
```
