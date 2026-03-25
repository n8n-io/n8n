#!/usr/bin/env node
import * as ecdsa from 'lib0/crypto/ecdsa'
import * as json from 'lib0/json'
import * as env from 'lib0/environment'

const prefix = env.getConf('name')

const keypair = await ecdsa.generateKeyPair({ extractable: true })
const privateJwk = json.stringify(await ecdsa.exportKeyJwk(keypair.privateKey))
const publicJwk = json.stringify(await ecdsa.exportKeyJwk(keypair.publicKey))

console.log(`
${prefix ? prefix.toUpperCase() + '_' : ''}PUBLIC_KEY=${publicJwk}
${prefix ? prefix.toUpperCase() + '_' : ''}PRIVATE_KEY=${privateJwk}
`)
