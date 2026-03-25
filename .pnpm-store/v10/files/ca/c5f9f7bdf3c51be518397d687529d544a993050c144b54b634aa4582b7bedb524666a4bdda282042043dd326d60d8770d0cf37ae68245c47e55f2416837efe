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

'use strict';

const errors = require("../../errors.js");

// The host information pattern of the EZConnect URL format.
/*
Used (?=) for lookahead and \\k<hostnames> for the backreference.Lookahead
and backreference together prevents catastrophic backtracking.
Test Case in oracle_private/ezconnectTest.js
*/

const HOSTNAMES_PATTERN = new RegExp("((?=(?<hostnames>(((\\[[A-z0-9:]+\\])|([A-z0-9][A-z0-9._-]+))[,]?)+)))\\k<hostnames>(:(?<port>\\d+)?)?", 'g');

// The EZConnect pattern without the extended settings part.
const EZ_URL_PATTERN = new RegExp("^(((?<protocol>[A-z0-9]+):)?//)?"
    + "(?<hostinfo>(" + HOSTNAMES_PATTERN.source + "(?=([,]|[;]|[/]|[:]|$))([,]|[;])?)+)"
    + "(/(?<servicename>[A-z0-9][A-z0-9,-.]+)?)"
    + "?(:(?<servermode>dedicated|shared|pooled))"
    + "?(/(?<instance>[A-z0-9][A-z0-9]+))?$", 'ig');

//'=' separates the connection property name and value.
const EXT_DOUBLE_QT = '"';

// '=' separates the connection property name and value.
const EXT_KEY_VAL_SEP = '=';

// '&' separates the connection properties.
const EXT_PARAM_SEP = '&';

// The parameters which will be part of the DESCRIPTION node.
const DESCRIPTION_PARAMS = ["ENABLE", "FAILOVER", "LOAD_BALANCE",
  "RECV_BUF_SIZE", "SEND_BUF_SIZE", "SDU",
  "SOURCE_ROUTE", "RETRY_COUNT", "RETRY_DELAY",
  "CONNECT_TIMEOUT", "TRANSPORT_CONNECT_TIMEOUT", "RECV_TIMEOUT", "USE_SNI", "COMPRESSION"];
/*
   DESCRIPTION
    This class takes care resolving the EZConnect format to Long TNS URL format.
    It also takes care of parsing the connection and url properties set in the url.
    The format of the EZConnect URL is :
    [[protocol:]//]host1[,host12;host13][:port1][,host2:port2][/service_name]
        [:server][/instance_name][?[key1=value1][&key2=value2]...

 */
class EZConnectResolver {
  constructor(url) {
    this.URL_PROPS_ALIAS = this.initializeUrlAlias();
    this.url = url;
    this.resolvedUrl = '';
    this.connectionProps = new Map();
    this.urlProps = new Map();
    this.lb = false;
  }

  /**
 * Returns the resolved long TNS String.
 * @return Resolved TNS URL.
 */
  getResolvedUrl() {
    this.parse();
    return this.resolvedUrl;
  }

  /**
   * First parse the extended settings part of the given url.
   * After parsing the extended settings if the remaining part of the URL is in
   * EZConnectURL format then resolve it to long TNS url format.
   */
  parse() {
    // First try to parse the extended settings part of the URL.
    let parsedUrl = this.parseExtendedSettings(this.url);
    if (this.connectionProps.size === 0 && this.urlProps.size === 0) {
      // If we have not parsed anything then use the received url as is.
      parsedUrl = this.url;
    }
    // Try to resolve the EZConnectURL to Long TNS URL.
    this.resolvedUrl = this.resolveToLongURLFormat(parsedUrl);
  }
  /**
  * Translate the given ezconnect url format to Long TNS format.
  * @param url EZConnect URL
  * @return Returns resolved TNS url.
  */
  resolveToLongURLFormat(url) {
    // URL is in the following format
    // [protocol://]host1[,host13][:port1][,host2:port2][/service_name][:server][/instance_name]

    const urlWithoutWhiteSpaces = url.replace(/\s/g, "");
    let bool = 0;
    let protocol = null, hostInfo = null, serviceName = null, serverMode = null, instanceName = null;
    for (const match of urlWithoutWhiteSpaces.matchAll(EZ_URL_PATTERN)) {
      bool = 1;
      protocol = match.groups.protocol;
      hostInfo = match.groups.hostinfo;
      serviceName = match.groups.servicename;
      serverMode = match.groups.servermode;
      instanceName = match.groups.instance;
    }
    if (!bool) {
      // No Processing required as the URL is not in ezconnect format.
      errors.throwErr(errors.ERR_INVALID_EZCONNECT_SYNTAX, 'input string not in easy connect format', urlWithoutWhiteSpaces);
    }

    if (protocol == null) {
      if (!(url.includes("//")))
        protocol = 'TCP';
    } else if (protocol.toLowerCase() != 'tcp' && protocol.toLowerCase() != 'tcps') {
      errors.throwErr(errors.ERR_INVALID_EZCONNECT_SYNTAX, 'Unsupported protocol in thin mode', protocol);
    }
    // Try to get the proxy information from URL properties
    const proxyHost = this.urlProps.get("HTTPS_PROXY");
    const proxyPort = this.urlProps.get("HTTPS_PROXY_PORT");
    const addressInfo =
      this.buildAddressList(hostInfo, protocol, proxyHost, proxyPort);

    const connectionIdPrefix =
      this.urlProps.get("CONNECTION_ID_PREFIX");
    // Build the available information in TNS format.
    const parts = [];
    if (this.lb)
      parts.push("(LOAD_BALANCE=ON)");
    parts.push(this.buildDescriptionParams());
    parts.push(addressInfo);
    parts.push(this.buildConnectData(serviceName, serverMode, instanceName,
      connectionIdPrefix));
    parts.push(this.buildSecurityInfo(protocol));
    return `(DESCRIPTION=${parts.join('')})`;
  }

  /**
   * Returns the CONNECT_DATA part of DESCRIPTION node of the TNS URL.
   * @param serviceName the database service name [optional].
   * @param serverMode dedicated or shared or pooled [optional].
   * @param instanceName the database instance name [optional].
   * @param connectionIdPrefix prefix which will be appended to the connection id [optional].
   * @return CONNECT_DATA as string
   */
  buildConnectData(serviceName, serverMode, instanceName, connectionIdPrefix) {
    const poolConnectionClass = this.urlProps.get("POOL_CONNECTION_CLASS");
    const poolPurity = this.urlProps.get("POOL_PURITY");
    const serviceTag = this.urlProps.get("SERVICE_TAG");
    const poolBoundary = this.urlProps.get("POOL_BOUNDARY");

    const parts = [];
    if (serviceName)
      parts.push(`(SERVICE_NAME=${serviceName})`);
    else
      parts.push('(SERVICE_NAME=)');
    if (serverMode)
      parts.push(`(SERVER=${serverMode})`);
    if (instanceName)
      parts.push(`(INSTANCE_NAME=${instanceName})`);
    if (poolConnectionClass)
      parts.push(`(POOL_CONNECTION_CLASS=${poolConnectionClass})`);
    if (poolPurity)
      parts.push(`(POOL_PURITY=${poolPurity})`);
    if (serviceTag)
      parts.push(`(SERVICE_TAG=${serviceTag})`);
    if (connectionIdPrefix)
      parts.push(`(CONNECTION_ID_PREFIX=${connectionIdPrefix})`);
    if (poolBoundary)
      parts.push(`(POOL_BOUNDARY=${poolBoundary})`);
    return `(CONNECT_DATA=${parts.join("")})`;
  }

  /**
* Builds the address information of the DESCRIPTION node with the given
* information.
* @param hostInfo host and port information separated by comma.
                hosts can be grouped into a ADDRESS_LIST using semi-colon ';'
* @param protocol either tcp or tcps [optional].
* @param proxyHost host name of the proxy server [optional].
* @param proxyPort proxy server port [optional].
* @return address information of the DESCRIPTION node.
*/
  buildAddressList(hostInfo, protocol,
    proxyHost, proxyPort) {
    const builder = new Array();
    let proxyInfo = '';
    if (proxyHost != null) {
      if (proxyPort != null) {
        proxyInfo = `(HTTPS_PROXY=${proxyHost})(HTTPS_PROXY_PORT=${proxyPort})`;
      } else {
        proxyInfo = `(HTTPS_PROXY=${proxyHost})`;
      }
    }

    if (protocol == null) protocol = 'TCP';
    let naddr = 0;
    // ; groups the user into a ADDRESS_LIST
    const addressLists = hostInfo.split(";");
    for (const addressList of addressLists) {
      let addressNodeCount = 0;
      const addressListBuilder = new Array();
      for (const match of addressList.matchAll(HOSTNAMES_PATTERN)) {
        const hostnames = (match.groups.hostnames).split(',');
        let port = match.groups.port;
        if (port == null) {
          port = '1521';    //default port
        }
        for (const hname of hostnames) {
          addressListBuilder.push(this.getAddrStr(hname, port, protocol, proxyInfo));
          addressNodeCount++;
        }
      }
      naddr += addressNodeCount;
      const parts = [];
      if (addressLists.length > 1 && addressNodeCount > 1)
        parts.push('(LOAD_BALANCE=ON)');
      parts.push(addressListBuilder.join(''));
      if (addressLists.length > 1)
        builder.push(`(ADDRESS_LIST=${parts.join('')})`);
      else
        builder.push(parts.join(''));
    }

    if (addressLists.length < 2 && naddr > 1) {
      this.lb = true;
    }

    return builder.join('');

  }
  /**
* Builds address information using the given hostname, port, protocol and
* proxyinfo.
* @param hostName
* @param port
* @param protocol
* @param proxyInfo
* @return addressInfo
*/
  getAddrStr(hostName, port, protocol, proxyInfo) {
    let host = hostName.trim();
    // If it is IPV6 format address then remove the enclosing '[' and ']'
    if (host.startsWith("[") && host.endsWith("]"))
      host = host.substring(1, host.length - 1);
    return `(ADDRESS=(PROTOCOL=${protocol})(HOST=${host})(PORT=${port})${proxyInfo})`;
  }
  /**
* Builds the parameters for the DESCRIPTION node using the parsed properties
* from the URL.
* @return Description Parameters String.
*/
  buildDescriptionParams() {
    if (this.urlProps.size === 0)
      return '';
    const builder = new Array();
    this.urlProps.forEach(function(v, k) {
      if (DESCRIPTION_PARAMS.includes(k)) // Add only if it is a DESCRIPTION node parameter
        builder.push(`(${k}=${v})`);
    });
    return builder.join('');
  }

  /**
* Builds the security section of the DESCRIPTION node, which contains the information
* about wallet location, server DN, encryption and checksum options.
* @return security node of the description as string.
*/
  buildSecurityInfo(protocol) {
    const securityInfo = new Array();
    if (protocol != null && protocol.toLowerCase() == "tcps") {
      // In EZConnect format if the DN match is not specified the enable it
      // by default for TCPS protocol.
      const serverDNMatch = this.urlProps.get("SSL_SERVER_DN_MATCH");
      const serverCertDN = this.urlProps.get("SSL_SERVER_CERT_DN");
      const walletDir = this.urlProps.get("MY_WALLET_DIRECTORY");
      if (serverDNMatch != null)
        securityInfo.push(`(SSL_SERVER_DN_MATCH=${serverDNMatch})`);
      if (serverCertDN != null)
        securityInfo.push(`(SSL_SERVER_CERT_DN=${serverCertDN}})`);
      if (walletDir != null)
        securityInfo.push(`(MY_WALLET_DIRECTORY=${walletDir})`);
    }
    if (securityInfo.length === 0)
      return '';
    return `(SECURITY=${securityInfo.join('')})`;
  }

  /**
   * If the URL has extended settings part appended to it, this method takes
   * care of parsing it.
   * Parses the Extended Settings and takes appropriate action based on the
   * settings type.
   * <URL>?<propertyName1>=<propertyValue1>&<propertyName2>=<propertyValue2>.
   * @param urlStr Database URL supplied by the application.
   * @return the parsed URL which does not contain the extended settings part.
   */
  parseExtendedSettings(urlStr) {
    const urlBytes = Array.from(urlStr.trim());
    const extendedSettingsIndex = this.findExtendedSettingPosition(urlBytes);

    if (extendedSettingsIndex == -1) {
      return urlStr; // No extended settings configuration found
    }
    this.parseExtendedProperties(urlBytes, (extendedSettingsIndex + 1));
    return urlStr.substring(0, extendedSettingsIndex);
  }
  /**
  * Loops through the chars of the extended settings part of the URL and
  * parses the connection properties.
  * @param urlChars URL in char[]
  * @param extIndex the begin index of the extended settings
  */
  parseExtendedProperties(urlChars, extIndex) {
    let key = null;
    let value = null;
    const token = new Array(urlChars.length);
    let tokenIndx = 0;
    let indices = '';
    for (let i = extIndex; i < urlChars.length; i++) {
      if (urlChars[i].trim() == '') {
        continue;   //if whitespace char, then ignore it
      }

      switch (urlChars[i]) {
        case EXT_DOUBLE_QT:
          indices = this.parseQuotedString(i, urlChars, tokenIndx, token);
          tokenIndx = indices[1];
          i = indices[0];
          break;

        // Hit a '=' assign the value up to this to param key and
        // reset the startIndex
        case EXT_KEY_VAL_SEP:
          if (key != null) {
            errors.throwErr(errors.ERR_INVALID_EZCONNECT_SYNTAX, 'unable to parse, invalid syntax', this.url);
          }
          key = token.join("").substring(0, tokenIndx).trim();
          tokenIndx = 0;
          break;

        // Hit a '&' assign the value up to this to param key and
        // reset the startIndex
        case EXT_PARAM_SEP:
          if (key == null) {
            errors.throwErr(errors.ERR_INVALID_EZCONNECT_SYNTAX, 'unable to parse, invalid syntax', this.url);
          }
          value = token.join("").substring(0, tokenIndx).trim();
          this.addParam(key, value);
          key = null;
          value = null;
          tokenIndx = 0;
          break;

        default:
          token[tokenIndx++] = urlChars[i];
      }
    }
    // We don't have any unassigned key, ignore the read chars.
    if (key != null) {
      value = token.join("").substring(0, tokenIndx).trim();
      this.addParam(key, value);
    }
  }

  /**
   * Parses the quoted string from the given startIndex of the urlChars and
   * return the length of the parsed quoted string.
   * @param startIndex index of the starting '"' in the urlChars
   * @param urlChars char[] of the url string.
   * @param tokenIndex starting index in the token char[] to store the result
   * @param token char[] to store the result
   * @return int[] int[0] - new index for urlChars, int[1] new index for token
   */
  parseQuotedString(startIndex, urlChars, tokenIndex, token) {
    let i = startIndex + 1; // look for closing '"' from the next index
    while (i < urlChars.length) {
      const curChar = urlChars[i];
      if (curChar == EXT_DOUBLE_QT) {
        // Got the " which ends the quoted block, so break the loop
        // Return the new indices, caller would resume from this new indices.
        return [i, tokenIndex];
      } else {
        token[tokenIndex++] = curChar;
      }
      i++;
    }
  }

  /**
   * Adds the given key and value to the connection properties.
   * @param key
   * @param value
   */
  addParam(key, value) {
    const aliasKeyName = key.toLowerCase();
    const propertyName = this.URL_PROPS_ALIAS.get(aliasKeyName);
    if (propertyName != null) {
      // if it is an URL alias then add to URL props
      this.urlProps.set(propertyName, value);
    } else {
      this.connectionProps.set(propertyName, value);
    }
  }

  findExtendedSettingPosition(urlBytes) {
    let urlNodeDepth = 0;
    for (let i = 0; i < urlBytes.length; i++) {
      if (urlBytes[i] == '(') urlNodeDepth++;
      else if (urlBytes[i] == ')') urlNodeDepth--;
      else if (urlBytes[i] == '?' && urlNodeDepth == 0) return i;
    }
    return -1;
  }

  /**
   * Initialize a Map with URL parameter alias. key is what we get from the
   * URL and the value is what we use while creating the TNS URL.
   * @return url alias map
   */
  initializeUrlAlias() {
    const aliasMap = new Map();
    aliasMap.set("enable", "ENABLE");
    aliasMap.set("compression", "COMPRESSION");
    aliasMap.set("failover", "FAILOVER");
    aliasMap.set("load_balance", "LOAD_BALANCE");
    aliasMap.set("recv_buf_size", "RECV_BUF_SIZE");
    aliasMap.set("send_buf_size", "SEND_BUF_SIZE");
    aliasMap.set("sdu", "SDU");
    aliasMap.set("source_route", "SOURCE_ROUTE");
    aliasMap.set("retry_count", "RETRY_COUNT");
    aliasMap.set("retry_delay", "RETRY_DELAY");
    aliasMap.set("https_proxy", "HTTPS_PROXY");
    aliasMap.set("https_proxy_port", "HTTPS_PROXY_PORT");
    aliasMap.set("connect_timeout", "CONNECT_TIMEOUT");
    aliasMap.set("transport_connect_timeout", "TRANSPORT_CONNECT_TIMEOUT");
    aliasMap.set("recv_timeout", "RECV_TIMEOUT");
    aliasMap.set("ssl_server_cert_dn", "SSL_SERVER_CERT_DN");
    aliasMap.set("ssl_server_dn_match", "SSL_SERVER_DN_MATCH");
    aliasMap.set("wallet_location", "MY_WALLET_DIRECTORY");
    aliasMap.set("pool_connection_class", "POOL_CONNECTION_CLASS");
    aliasMap.set("pool_purity", "POOL_PURITY");
    aliasMap.set("service_tag", "SERVICE_TAG");
    aliasMap.set("connection_id_prefix", "CONNECTION_ID_PREFIX");
    aliasMap.set("pool_boundary", "POOL_BOUNDARY");
    aliasMap.set("use_sni", "USE_SNI");
    return aliasMap;
  }
}module.exports = EZConnectResolver;
