// Copyright (c) 2022, 2025, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------


module.exports =  {
  // TNS packet types
  NSPTCN: 1,          // Connect
  NSPTAC: 2,          // Accept
  NSPTAK: 3,          // Acknowledge
  NSPTRF: 4,          // Refuse
  NSPTRD: 5,          // Redirect
  NSPTDA: 6,          // Data
  NSPTNL: 7,          // Null
  NSPTAB: 9,          // Abort
  NSPTRS: 11,         // Re-send
  NSPTMK: 12,         // Marker
  NSPTAT: 13,         // Attention
  NSPTCNL: 14,        // Control information
  NSPTDD: 15,         // data descriptor
  NSPTHI: 19,         // Highest legal packet type

  // Packet Header
  NSPHDLEN: 0,       // Packet length
  NSPHDPSM: 2,       // Packet checksum(deprecated in version 3.15 with large sdu support)
  NSPHDTYP: 4,       // Packet type
  NSPHDFLGS: 5,      // Packet flags
  NSPHDHSM: 6,       // Header checksum
  NSPSIZHD: 8,       // Packet header size

  /* Packet flags for NSPHDFLGS */
  NSPFSID: 0x01,     // SID is given
  NSPFRDS: 0x02,     // ReDirect Separation of cnda vs cndo
  NSPFRDR: 0x04,     // ReDiRected client Connect (NSPTCN)
  NSPFLSD: 0x20,     // packet with large sdu field
  NO_HEADER_FLAGS: 0,
  NSPFSRN: 0x08,

  // Connect Packet
  NSPCNVSN: 8,    // My version number
  NSPCNLOV: 10,   // Lowest version number I can be compatible with
  NSPCNOPT: 12,   // Global service options
  NSPCNSDU: 14,   // My SDU size
  NSPCNTDU: 16,   // Maximum TDU size
  NSPCNNTC: 18,   // NT characterstics
  NSPCNTNA: 20,   // Line turnaround value
  NSPCNONE: 22,   // The value '1' in my hardware byte order
  NSPCNLEN: 24,   // Length of connect data
  NSPCNOFF: 26,   // Offset to connect data
  NSPCNMXC: 28,   // Maximum connect data you can send me
  NSPCNFL0: 32,   // Connect flags
  NSPCNFL1: 33,
  NSPCNTMO: 50,   // local connection timeout val
  NSPCNTCK: 52,   // local tick size
  NSPCNADL: 54,
  NSPCNAOF: 56,   // offset to reconnect tns addr
  NSPCNLSD: 58,   // large sdu
  NSPCNLTD: 62,   // large tdu
  NSPCNCFL: 66,   // compression data
  NSPCNCFL2: 70,  // connect flag2
  //  NSPCNV310DAT : (NSPCNTMO + 8), start of connect data, V3.10   packet
  //  NSPCNV315DAT : (NSPCNCFL + 4),
  NSPCNDAT: 74,      // Start connect data
  NSPMXCDATA: 230,   // Maximum length of connect data
  // Connect flags (Used mostly by NA)
  NSINAWANTED: 0x01, // Want to use NA
  NSINAINTCHG: 0x02, // Interchange involved
  NSINADISABLEDFORCONNECTION: 0x04, // Disable NA
  NSINANOSERVICES: 0x08, // No NA services linked
  NSINAREQUIRED: 0x10,   // NA is required
  NSINAAUTHWANTED: 0x20, // Authentication linked
  NSISUPSECRENEG: 0x80,  // bkwrd comp: SUPport SECurity RE-NEG
  // Connect options
  NSGDONTCARE: 0x0001, // "don't care"
  NSGHDX: 0x0002, // half-duplex (w/ token management)
  NSGFDX: 0x0004, // full-duplex
  NSGHDRCHKSUM: 0x0008, // checksum on packet header
  NSGPAKCHKSUM: 0x0010, // checksum on entire packet
  NSGBROKEN: 0x0020, // provide broken connection notification
  NSGUSEVIO: 0x0040, // can use Vectored I/O
  NSGOSAUTHOK: 0x0080, // use OS authentication
  NSGSENDATTN: 0x0200, // can send attention
  NSGRECVATTN: 0x0400, // can recv attention
  NSGNOATTNPR: 0x0800, // no attention processing
  NSGRAW: 0x1000, // I/O is direct to/from transport
  TNS_VERSION_DESIRED: 319,
  TNS_VERSION_MINIMUM: 300,
  TNS_VERSION_MIN_DATA_FLAGS: 318,
  TNS_VERSION_MIN_END_OF_RESPONSE: 319,
  TNS_UUID_OFFSET: 45,

  /* Accept Packet */
  NSPACVSN: 8,   // connection version
  NSPACOPT: 10,  // global service options
  NSPACSDU: 12,  // SDU size
  NSPACTDU: 14,  // Maximum TDU
  NSPACONE: 16,  // The value '1' in my hardware byte order
  NSPACLEN: 18,  // connect data length
  NSPACOFF: 20,  // offset to connect data
  NSPACFL0: 22,  // connect flags
  NSPACFL1: 23,
  NSPACTMO: 24,  // connection pool timeout value
  NSPACTCK: 26,  // local tick size
  NSPACADL: 28,  // reconnect tns address length
  NSPACAOF: 30,  // offset to reconnect tns addr
  NSPACLSD: 32,  // Large sdu
  NSPACLTD: 36,  // Large tdu
  NSPACCFL: 40,  // compression flag
  NSPACFL2: 41,  // accept flag2 (4 bytes)
  NSPACV310DAT: 32, /* start of accept data, V3.10     packet */
  NSPACV315DAT: 41, // start of accept data, V3.15     packet

  /* Refuse Packet */
  NSPRFURS: 8,  // User (appliction) reason for refusal
  NSPRFSRS: 9,  // System (NS) reason for
  NSPRFLEN: 10, // Length of refuse data
  NSPRFDAT: 12, // Start of connect data
  // Compression flags
  NSPACCFON: 0x80, // 1st MSB:  compression on/off
  NSPACCFAT: 0x40, // 2nd MSB :   compression auto
  NSPACCFNT: 0x02, // Second last LSB : compression for non-tcp protocol
  // Accept flag2
  NSPACOOB: 0x00000001, // OOB support check at connection time
  NSGPCHKSCMD: 0x01000000, // Support for Poll and Check logic
  TNS_ACCEPT_FLAG_HAS_END_OF_REQUEST: 0x02000000,
  TNS_ACCEPT_FLAG_FAST_AUTH: 0x10000000, // Support Fast Auth

  /* Redirect packet */
  NSPRDLEN: 8,   // Length of redirect data
  NSPRDDAT: 10,  // Start of connect data

  /* Data Packet */
  NSPDAFLG: 8,    // Data flags
  NSPDADAT: 10,   // Start of Data
  NSPDAFEOF: 0x40, // "end of file"
  NSPDAFCMP: 0x400,  // "compressed data"

  /* Marker Packet */
  NSPMKTYP: 8,     // marker type (see below)
  NSPMKODT: 9,     // old (pre-V3.05) data byte
  NSPMKDAT: 10,    // data byte
  NSPMKTD0: 0,     // data marker - 0 data bytes
  NSPMKTD1: 1,     // data marker - 1 data byte
  NSPMKTAT: 2,     // Attention Marker
  NIQBMARK: 1,     // Break marker
  NIQRMARK: 2,     // Reset marker
  NIQIMARK: 3,     // Interrupt marker

  /* Control Packet */
  NSPCTLCMD: 8,  // Control Command length is 2 bytes
  NSPCTLDAT: 10, // Control Data length is specific to the Command type.
  NSPCTL_SERR: 8,  // Error Control Command Type
  NSPCTL_CLRATTN: 9,  // Clear OOB option

  /* OPTIONS */
  NSPDFSDULN: 8192,    // default SDU size
  NSPABSSDULN: 2097152, // maximim SDU size
  NSPMXSDULN: 65535,   // maximim SDU size
  NSPMNSDULN: 512,     // minimum SDU size
  NSPDFTDULN: 2097152, // default TDU size
  NSPMXTDULN: 2097152, // maximum TDU size
  NSPMNTDULN: 255,     // minimum TDU size
  NSFIMM: 0x0040,  // immediate close

  /* PARAMETERS */
  DISABLE_OOB_STR: 'DISABLE_OOB', // disable OOB parameter
  EXPIRE_TIME: 'EXPIRE_TIME', // expire Time
  PEM_WALLET_FILE_NAME: 'ewallet.pem',
  DEFAULT_TRANSPORT_CONNECT_TIMEOUT: 20000, //default transport connect timeout
  DEFAULT_RETRY_DELAY: 1000, //default retry delay

  /* Get/Set options */
  NT_MOREDATA: 1, // More Data in Transport available
  NS_MOREDATA: 2, // More Data available to be read
  SVCNAME: 3, // Service name
  SERVERTYPE: 4, // Server type
  REMOTEADDR: 5, // Remote Address
  HEALTHCHECK: 6, // Health check of connection
  CONNCLASS: 7, // Connection Class
  PURITY: 8, // Purity
  SID: 9, // SID

  /* Network Compression Algorithms */
  NETWORK_COMPRESSION_ZLIB: 2,

  /* FLAGS */
  NSNOBLOCK: 0x0001, // Do not block
};
