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

const { findNVPairRecurse, createNVPair } = require('./nvStrToNvPair.js');
const errors = require("../../errors.js");
const os = require("os");
const net = require('net');
const dns = require('dns');
const dnsPromises = dns.promises;
const cInfo = require("../util.js").CLIENT_INFO;

const SchemaObjectFactoryInterface = {
  ADDR: 0,
  ADDR_LIST: 1,
  DESC: 2,
  DESC_LIST: 3,
};

/**
 * Class representing Address Object
 */
class Address {

  /** return the type of this SchemaObject */
  isS() {
    return SchemaObjectFactoryInterface.ADDR;
  }

  /** initialize this object from the given string
   * @param string the string
   *  Error thrown if invalid NV-string format (ie, bad parens)
   *  Error thrown if invalid syntax
   *               (ie, "(ADDRESS=(DESCRIPTION=...)) and  ")
   */
  initFromString(s) {
    const nvp = createNVPair(s);
    this.initFromNVPair(nvp);
  }

  /** initialize this object from an NVPair
   * @param nvp the NVPair
   * Error thrown if invalid syntax
   *               (ie, "(ADDRESS=(DESCRIPTION=...))")
   */
  initFromNVPair(nvp) {
    if (nvp == null || !(nvp.name.toUpperCase() == "ADDRESS"))
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    const protnvp = findNVPairRecurse(nvp, 'protocol');
    const portnvp = findNVPairRecurse(nvp, 'port');
    const hostnvp = findNVPairRecurse(nvp, 'host');
    const httpsProxyNVP = findNVPairRecurse(nvp, 'https_proxy');
    const httpsProxyPortNVP = findNVPairRecurse(nvp, 'https_proxy_port');

    if (portnvp)
      this.port = Number(portnvp.atom);

    if (hostnvp)
      this.host = hostnvp.atom;

    if (protnvp)
      this.prot = protnvp.atom;

    if (httpsProxyNVP)
      this.httpsProxy = httpsProxyNVP.atom;
    if (httpsProxyPortNVP)
      this.httpsProxyPort = Number(httpsProxyPortNVP.atom);

    this.addr = nvp.toString();
  }

  /** return the string representation of this object */
  toString() {
    return this.addr;
  }
}

/**
 * Class representing addressList object
 */
class AddressList {
  constructor() {
    this.children = new Array();
    this.sourceRoute = false;
    this.loadBalance = false;
    this.failover = true;
  }
  /** return the type of this SchemaObject */
  isS() {
    return SchemaObjectFactoryInterface.ADDR_LIST;
  }

  /** initialize this object from the given string
   * @param string the string
   *  Error thrown if invalid NV-string format (ie, bad parens)
   *  Error thrown if invalid syntax
   *               (ie, "(ADDRESS=(DESCRIPTION=...))")
   */
  initFromString(s) {
    const nvp = createNVPair(s);
    this.initFromNVPair(nvp);
  }

  /** initialize this object from an NVPair
   * @param nvp the NVPair
   * Error thrown if invalid syntax
   *               (ie, "(ADDRESS=(DESCRIPTION=...))")
   */
  initFromNVPair(nvp) {
    /* for each child of "ADDRESS_LIST", create child or set SR/LB/FO */
    this.children = [];
    let childnv, child;
    const listsize = nvp.getListSize();
    if (listsize == 0) /* atom can not be valid */
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);

    for (let i = 0; i < listsize; i++) {
      childnv = nvp.getListElement(i);
      if (childnv.name.toUpperCase() == "SOURCE_ROUTE") {
        this.sourceRoute = (childnv.atom.toLowerCase() == "yes"
          || childnv.atom.toLowerCase() == "on"
          || childnv.atom.toLowerCase() == "true");
      } else if (childnv.name.toUpperCase() == "LOAD_BALANCE") {
        this.loadBalance = (childnv.atom.toLowerCase() == "yes"
          || childnv.atom.toLowerCase() == "on"
          || childnv.atom.toLowerCase() == "true");
      } else if (childnv.name.toUpperCase() == "FAILOVER") {
        this.failover = (childnv.atom.toLowerCase() == "yes"
          || childnv.atom.toLowerCase() == "on"
          || childnv.atom.toLowerCase() == "true");
      } else if (childnv.name.toUpperCase() == "ADDRESS") {
        child = new NavAddress();
        child.initFromNVPair(childnv);
        this.children.push(child);
      } else if (childnv.name.toUpperCase() == "ADDRESS_LIST") {
        child = new NavAddressList();
        child.initFromNVPair(childnv);
        this.children.push(child);
      } else errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    if (this.children.length == 0) errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
  }


  /** return the string representation of this object */
  toString() {
    let s = new String("");
    if (this.children.size() < 1) // there is no address list without addresses
      return s;
    s += "(ADDRESS_LIST=";

    for (let i = 0; i < this.children.size(); i++)
      s += this.children[i].toString();

    if (this.sourceRoute) s += "(SOURCE_ROUTE=yes)" + NavSchemaObject.HC;
    if (this.loadBalance) s += "(LOAD_BALANCE=yes)";
    if (!this.failover) s += "(FAILOVER=false)";

    s += ")";

    return s;
  }
}

/**
 * Class represnting description object
 */
class Description {
  // description-level stuff
  constructor() {
    this.children = new Array();
    this.sourceRoute = false;
    this.loadBalance = false;
    this.failover = true;
    this.delayInMillis = -1;
    this.params = {};
  }

  /**
    * Return the type of this SchemaObject
   */
  isS() {
    return SchemaObjectFactoryInterface.DESC;
  }

  /**
    * Initialize this object from the given string
    *
    * @param string
    *          the string
    * Error rhrown if invalid NV-string format (ie, bad parens)
    * Error thrown if invalid syntax (ie, "(ADDRESS=(DESCRIPTION=...))")
  */
  initFromString(s) {
    const nvp = createNVPair(s);
    this.initFromNVPair(nvp);
  }

  /** initialize this object from an NVPair
   * @param nvp the NVPair
   * Error thrown if invalid syntax
   *               (ie, "(ADDRESS=(DESCRIPTION=...))")
   */
  //errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
  initFromNVPair(nvp) {
    const listsize = nvp.getListSize();
    let childnv, child;
    if (listsize == 0) // atom can not be valid
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);

    for (let i = 0; i < listsize; i++) {
      childnv = nvp.getListElement(i);
      if (childnv.name.toUpperCase() == "SOURCE_ROUTE") {
        this.sourceRoute = (childnv.atom.toLowerCase() == "yes"
                  || childnv.atom.toLowerCase() == "on"
                  || childnv.atom.toLowerCase() == "true");
      } else if (childnv.name.toUpperCase() == "LOAD_BALANCE") {
        this.loadBalance = (childnv.atom.toLowerCase() == "yes"
                  || childnv.atom.toLowerCase() == "on"
                  || childnv.atom.toLowerCase() == "true");
      } else if (childnv.name.toUpperCase() == "FAILOVER") {
        this.failover = (childnv.atom.toLowerCase() == "yes"
                  || childnv.atom.toLowerCase() == "on"
                  || childnv.atom.toLowerCase() == "true");
      } else if (childnv.name.toUpperCase() == "USE_SNI") {
        this.params.useSNI = (childnv.atom.toLowerCase() == "yes"
                            || childnv.atom.toLowerCase() == "on"
                            || childnv.atom.toLowerCase() == "true");
      } else if (childnv.name.toUpperCase() == "ADDRESS_LIST") {
        child = new NavAddressList();
        child.initFromNVPair(childnv);
        this.children.push(child);
      } else if (childnv.name.toUpperCase() == "ADDRESS") {
        child = new NavAddress();
        child.initFromNVPair(childnv);
        this.children.push(child);
      } else if (childnv.name.toUpperCase() == "CONNECT_DATA") {
        let tmpnv;
        const listsize = childnv.getListSize();
        for (let i = 0; i < listsize; i++) {
          tmpnv = childnv.getListElement(i);
          if (tmpnv.name.toUpperCase() == "CONNECTION_ID_PREFIX") {
            this.params.connectionIdPrefix = tmpnv.atom;
            childnv.removeListElement(i);
            break;
          }
        }
        this.connectData = childnv.valueToString();
      } else if (childnv.name.toUpperCase() == "RETRY_DELAY") {
        // Delay between retries.
        // If no unit is provided, it is interpreted in seconds.
        // The value is internally stored in milliseconds.
        if (childnv.atom > 0)
          this.delayInMillis = childnv.atom * 1000;
      } else if (childnv.name.toUpperCase() == "RETRY_COUNT") {
        this.retryCount = childnv.atom;
      } else if (childnv.name.toUpperCase() == "CONNECTION_ID_PREFIX") {
        this.conidPrefix = childnv.atom;
      } else if (childnv.name.toUpperCase() == "CONNECT_TIMEOUT") {
        if (childnv.atom > 0)
          this.params.connectTimeout = childnv.atom;
      } else if (childnv.name.toUpperCase() == "TRANSPORT_CONNECT_TIMEOUT") {
        if (childnv.atom > 0)
          this.params.transportConnectTimeout = childnv.atom;
      } else if (childnv.name.toUpperCase() == "ENABLE") {
        this.params.enable = childnv.atom;
      } else if (childnv.name.toUpperCase() == "RECV_TIMEOUT") {
        if (childnv.atom > 0) {
          this.params.recvTimeout = childnv.atom;
        }
      } else if (childnv.name.toUpperCase() == "SDU") {
        this.params.sdu = childnv.atom;
      } else if (childnv.name.toUpperCase() == "COMPRESSION") {
        this.params.networkCompression = (childnv.atom.toLowerCase() == "yes"
                  || childnv.atom.toLowerCase() == "on"
                  || childnv.atom.toLowerCase() == "true");
        this.params.networkCompressionLevels = [];
      } else if (childnv.name.toUpperCase() == "COMPRESSION_LEVELS") {
        const listsize = childnv.getListSize();
        for (let i = 0; i < listsize; i++) {
          const tmpnv = childnv.getListElement(i);
          if (tmpnv.name.toUpperCase() == "LEVEL") {
            this.params.networkCompressionLevels.push(tmpnv.atom.toLowerCase());
          }
        }
      } else if (childnv.name.toUpperCase() == "EXPIRE_TIME") {
        if (childnv.atom > 0)
          this.params.expireTime = childnv.atom;
      } else if (childnv.name.toUpperCase() == "SECURITY") {
        const listsize = childnv.getListSize();
        let tmpnv;
        for (let i = 0; i < listsize; i++) {
          tmpnv = childnv.getListElement(i);
          if (tmpnv.name.toUpperCase() == "SSL_SERVER_CERT_DN") {
            this.params.sslServerCertDN = tmpnv.valueToString();
          } else if (tmpnv.name.toUpperCase() == "SSL_SERVER_DN_MATCH") {
            this.params.sslServerDNMatch = (tmpnv.atom.toLowerCase() == "yes"
            || tmpnv.atom.toLowerCase() == "on"
            || tmpnv.atom.toLowerCase() == "true");
          } else if (tmpnv.name.toUpperCase() == "SSL_ALLOW_WEAK_DN_MATCH") {
            this.params.sslAllowWeakDNMatch = (tmpnv.atom.toLowerCase() == "yes"
            || tmpnv.atom.toLowerCase() == "on"
            || tmpnv.atom.toLowerCase() == "true");
          } else if ((tmpnv.name.toUpperCase() == "WALLET_LOCATION") || (tmpnv.name.toUpperCase() == "MY_WALLET_DIRECTORY")) {
            this.params.walletLocation = tmpnv.atom;
          }
        }
      }
    }
  }

  toString() {
    let s = new String(""), child ;

    // see if there are any endpoints
    child = new String("");
    for (let i = 0; i < this.children.size(); i++) {
      child = this.children[i].toString();
      if (!child == "")
        s += child;
    }

    // some parameters make sense only if there are endpoints defined
    if (!s == "" && this.sourceRoute)
      s += "(SOURCE_ROUTE=yes)";
    if (!s == "" && this.loadBalance)
      s += "(LOAD_BALANCE=yes)";
    if (!s == "" && !this.failover)
      s += "(FAILOVER=false)";
    if (!s.equals(""))
      s = "(DESCRIPTION=" + s + ")";

    return s;
  }
}

/**
 * Class representing DescriptionList object.
 */
class DescriptionList {

  constructor() {
    this.children = new Array();
    this.sourceRoute = false;
    this.loadBalance = true;
    this.failover = true;
  }

  /** return the type of this SchemaObject */
  isS() {
    return SchemaObjectFactoryInterface.ADDR_LIST;
  }

  /** initialize this object from the given string
   * @param string the string
   * Error thrown if invalid NV-string format (ie, bad parens)
   * Error thrown if invalid syntax
   *               (ie, "(ADDRESS=(DESCRIPTION=...))")
   */
  initFromString(s) {
    const nvp = createNVPair(s);
    this.initFromNVPair(nvp);
  }

  /** initialize this object from an NVPair
   * @param nvp the NVPair
   * Error thrown if invalid syntax
   *               (ie, "(ADDRESS=(DESCRIPTION=...))")
   */
  initFromNVPair(nvp) {
    const listsize = nvp.getListSize();
    let child, childnv;
    if (listsize == 0) /* atom can not be valid */
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);

    for (let i = 0; i < listsize; i++) {
      childnv = nvp.getListElement(i);
      if (childnv.name.toUpperCase() == "SOURCE_ROUTE") {
        this.sourceRoute = (childnv.atom.toLowerCase() == "yes"
                      || childnv.atom.toLowerCase() == "on"
                      || childnv.atom.toLowerCase == "true");
      } else if (childnv.name.toUpperCase() == "LOAD_BALANCE") {
        this.loadBalance = (childnv.atom.toLowerCase() == "yes"
                      || childnv.atom.toLowerCase() == "on"
                      || childnv.atom.toLowerCase() == "true");
      } else if (childnv.name.toUpperCase() == "FAILOVER") {
        this.failover = (childnv.atom.toLowerCase() == "yes"
                  || childnv.atom.toLowerCase() == "on"
                  || childnv.atom.toLowerCase() == "true");
      } else if (childnv.name.toUpperCase() == "DESCRIPTION") {
        child = new NavDescription();
        child.initFromNVPair(childnv);
        this.children.push(child);
      } else errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    if (this.children.length == 0) errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
  }

  /** return the string representation of this object */
  toString() {
    let s = new String("");
    if (this.children.size() < 1) // no descr list without descriptions
      return s;

    let child = new String("");
    for (let i = 0; i < this.children.size(); i++) {
      child = this.children[i].toString();
      if (!child.equals(""))
        s += child;
    }

    // some parameters make sense only if there are endpoints defined
    if (s.equals("") && this.sourceRoute) s += "(SOURCE_ROUTE=yes)";
    if (s.equals("") && !this.loadBalance) s += "(LOAD_BALANCE=no)";
    if (s.equals("") && !this.failover)   s += "(FAILOVER=false)";

    if (!s.equals("")) // no valid children were found
      s = "(DESCRIPTION_LIST=" + s + ")";

    return s;
  }
}


/**
 * Class that contains information about a possible connection.
 */
class ConnOption {
  constructor() {
    this.CNdata = new Array();
  }

}

const NavSchemaObject = {
  DEBUG: false,
  SR: "(SOURCE_ROUTE=yes)",
  HC: "(HOP_COUNT=0)",
  LB: "(LOAD_BALANCE=yes)",
  NFO: "(FAILOVER=false)",
  CD: "(CONNECT_DATA=",
  CONID: "(CONNECTION_ID="
};
const options = {
  all: true,
};

/**
 * Class that navigates the address node in the tree.
 */
class NavAddress extends Address {
  constructor() {
    super();
  }

  /**
   * Set the connection option to this address.
   * @param {object} cs
   */
  async navigate(cs) {
    let addresses;
    let nullHost = false;
    let needToCloseDescription = false;
    if (!this.host) {
      nullHost = true;
      this.host = os.hostname();
      try {
        await dnsPromises.lookup(this.host, options);
      } catch {
        this.host = 'localhost';
      }
    }
    // Sometimes REDIRECT packets do not have DESCRIPTION
    // this is for handling such conditions.
    if (cs.getcurrentDescription() == null) {
      cs.newConnectionDescription();
      needToCloseDescription = true;
    }
    if (!net.isIP(this.host) && !(cs.httpsProxy || this.httpsProxy)) {
      try {
        addresses = await dnsPromises.lookup(this.host, options);
        for (const addr of addresses) {
          const co = new ConnOption();
          co.hostname = this.host;
          co.port = this.port;
          co.protocol = this.prot;
          co.httpsProxy = this.httpsProxy;
          co.httpsProxyPort = this.httpsProxyPort;
          co.desc = cs.getcurrentDescription();
          co.CNdata.push(cs.sBuf.join(""));
          if (nullHost)
            co.CNdata.push('(address=(protocol=' + this.prot + ')(host=' + this.host + ')(port=' + this.port + '))');
          else
            co.CNdata.push(this.toString());
          co.host = addr.address;
          co.addr = this.addr;
          cs.getcurrentDescription().addConnectOption(co);
        }
      } catch {
        // do nothing
        // Any error in the try block is ignored, because we want to try
        // the next address
      }
    } else {
      const co = new ConnOption();
      co.hostname = this.host;
      co.port = this.port;
      co.protocol = this.prot;
      co.httpsProxy = this.httpsProxy;
      co.httpsProxyPort = this.httpsProxyPort;
      co.desc = cs.getcurrentDescription();
      co.CNdata.push(cs.sBuf.join(""));
      co.CNdata.push(this.toString());
      co.host = this.host;
      co.addr = this.addr;
      cs.getcurrentDescription().addConnectOption(co);
    }

    if (needToCloseDescription) {
      cs.closeDescription();
    }

  }

  /**
   * AddToString is used to construct a string representation of the TNS
   * Address. Constructing a string is mainly needed when source route is ON.
   */
  addToString(cs) {
    const NVString = this.toString();
    let cOpts = new Array();
    cOpts = cs.getcurrentDescription().getConnectOptions();
    for (let i = 0;i < cOpts.length; i++) {
      if (cOpts[i].done) {
        continue;
      }
      cOpts[i].CNdata.push(NVString);
    }
  }
}

/**
 * Class that navigates the addressList node in the tree.
 */
class NavAddressList extends AddressList {
  constructor() {
    super();
    this.activeChildren = new Array();
    this.sBuflength = 0;
  }

  /**
   * Method decides how to traverse and sets the active children based on
   * the loadbalancing, failover values.
   * @param {object} cs
   */
  async navigate(cs) {
    await this.navigate2(cs, 0);
  }

  async navigate2(cs, reCurCnt) {
    reCurCnt++;
    this.sBuflength = cs.sBuf.length;
    cs.sBuf.push("(ADDRESS_LIST=");
    if (this.sourceRoute) {
      this.activeChildren = this.children;
      await this.activeChildren[0].navigate(cs);

      for (let i = 1; i < this.activeChildren.length; i++) {
        this.activeChildren[i].addToString(cs);
      }
    } else { // SR is off
      this.activeChildren = NavDescriptionList.setActiveChildren(this.children, this.failover,
        this.loadBalance);
      for (let i = 0; i < this.activeChildren.length; i++) {
        if (this.getChildrenType(i) == 1) {
          await this.activeChildren[i].navigate2(cs, reCurCnt);
        } else {
          await this.activeChildren[i].navigate(cs);
        }

      }
    }
    this.closeNVPair(cs);
    cs.sBuf.length = this.sBuflength;

  }

  addToString(cs) {
    const NVString = this.toString();
    let cOpts = new Array();
    cOpts = cs.getcurrentDescription().getConnectOptions();
    for (let i = 0;i < cOpts.length; i++) {
      if (cOpts[i].done) {
        continue;
      }
      cOpts[i].CNdata.push(NVString);
    }
  }

  getChildrenSize() {
    let size = 0;
    for (let i = 0; i < this.activeChildren.length; i++) {
      if (this.getChildrenType(i) == 1) {
        size += this.activeChildren[i].getChildrenSize();
      } else {
        size++;
      }
      if (this.sourceRoute)
        return size;
    }
    return (size);
  }

  /**
   * get children type
  */
  getChildrenType(childNum) {
    return (this.activeChildren[childNum].isS());
  }

  /**
   *get child at a given pos
  */
  getChild(childNum) {
    return (this.children[childNum]);
  }

  closeNVPair(cs) {
    let cOpts = new Array();
    const childS = this.getChildrenSize();
    if (cs.getcurrentDescription() != null) {
      cOpts = cs.getcurrentDescription().getConnectOptions();
      let numChildren = 0;
      let prevHost = null;
      let prevPort = null;
      for (let i = cOpts.length - 1 ; (i >= 0
              && !cOpts[i].done); i--) {
        if (cOpts[i].hostname != prevHost || cOpts[i].port != prevPort)
          numChildren++;
        prevHost = cOpts[i].hostname;
        prevPort = cOpts[i].port;

        // close NV Pair for current active children
        if ((numChildren > childS)) {
          break;
        }

        if (this.sourceRoute) {
          cOpts[i].CNdata.push(NavSchemaObject.SR);
          cOpts[i].CNdata.push(NavSchemaObject.HC);
          cOpts[i].done = true;
        }
        // Always close the NV Pair with a ")"
        cOpts[i].CNdata.push(")");
      }
    }
  }


}

/**
 * Class that navigates the description node in a tree.
 */
class NavDescription extends Description {
  constructor() {
    super();
    this.activeChildren = new Array();
    this.descProcessed = 0;
  }

  /**
 * Method decides how to traverse and sets the active children based on
 * the loadbalancing, failover values. Also creates connection description
 * object.
 * @param {object} cs
 */
  async navigate(cs) {
    cs.sBuf.length = 0; //reset
    cs.sBuf.push("(DESCRIPTION=");
    const desc = cs.newConnectionDescription(); //connectiondescription
    if (this.retryCount != null) {
      cs.retryCount = this.getIntValue(this.retryCount, cs.retryCount);
      desc.retryCount = cs.retryCount;
    }
    if (this.delayInMillis != -1) {
      desc.delayInMillis = this.delayInMillis;
    }

    desc.params = this.params;
    if ('connectTimeout' in this.params) {
      cs.sBuf.push("(CONNECT_TIMEOUT=" + this.params.connectTimeout + ")");
    }
    if ('transportConnectTimeout' in this.params) {
      cs.sBuf.push("(TRANSPORT_CONNECT_TIMEOUT=" + this.params.transportConnectTimeout + ")");
    }
    if ('recvTimeout' in this.params) {
      cs.sBuf.push("(RECV_TIMEOUT=" + this.params.recvTimeout + ")");
    }
    if ('sdu' in this.params) {
      cs.sBuf.push("(SDU=" + this.params.sdu + ")");
    }
    if ('expireTime' in this.params) {
      cs.sBuf.push("(EXPIRE_TIME=" + this.params.expireTime + ")");
    }
    if ('enable' in this.params) {
      cs.sBuf.push("(ENABLE=" + this.params.enable + ")");
    }
    if ('useSNI' in this.params) {
      cs.sBuf.push("(USE_SNI=" + this.params.useSNI + ")");
    }
    if (('sslServerCertDN' in this.params) || ('sslServerDNMatch' in this.params) || ('walletLocation' in this.params) || ('sslAllowWeakDNMatch' in this.params)) {
      cs.sBuf.push("(SECURITY=");
      if ('sslServerCertDN' in this.params) {
        cs.sBuf.push("(SSL_SERVER_CERT_DN=" + this.params.sslServerCertDN + ")");
      }
      if ('sslServerDNMatch' in this.params) {
        cs.sBuf.push("(SSL_SERVER_DN_MATCH=" + this.params.sslServerDNMatch + ")");
      }
      if ('sslAllowWeakDNMatch' in this.params) {
        cs.sBuf.push("(SSL_ALLOW_WEAK_DN_MATCH=" + this.params.sslAllowWeakDNMatch + ")");
      }
      if ('walletLocation' in this.params) {
        cs.sBuf.push("(WALLET_LOCATION=" + this.params.walletLocation + ")");
      }
      cs.sBuf.push(")");
    }
    if ('httpsProxyPort' in this.params) {
      cs.sBuf.push("(HTTPS_PROXY_PORT=" + this.params.httpsProxyPort + ")");
    }
    if ('httpsProxy' in this.params) {
      cs.sBuf.push("(HTTPS_PROXY=" + this.params.httpsProxy + ")");
    }
    if (!this.failover) {
      cs.sBuf.push(NavSchemaObject.NFO);
    }
    if (!this.sourceRoute) {
      // SR is off, navigate every child and close the NV Pair
      this.activeChildren = NavDescriptionList.setActiveChildren(this.children, this.failover,
        this.loadBalance);
      for (let i = 0; i < this.activeChildren.length; i++) {
        await this.activeChildren[i].navigate(cs);
      }
      this.closeNVPair(cs);
    } else {
      // SR is ON
      this.activeChildren = this.children;
      await this.activeChildren[0].navigate(cs);
      for (let i = 1; i < this.activeChildren.length; i++) {
        this.activeChildren[i].addToString(cs);
      }
      this.closeNVPair(cs);
    }
    cs.closeDescription();

  }

  closeNVPair(cs) {
    if (cs.getcurrentDescription() == null)
      return;
    let cOpts = new Array();
    cOpts = cs.getcurrentDescription().getConnectOptions();
    for (let i = 0; i < cOpts.length; ++i) {

      if (this.sourceRoute) {
        cOpts[i].CNdata.push(NavSchemaObject.SR);
      }

      // Use default service, if no connect_data
      if (this.connectData == null) {
        this.connectData = "(SERVICE_NAME=)";
      }

      let pgmName = cInfo.program;
      if (cs.program) {
        pgmName = cs.program;
      }
      let hostName = cInfo.hostName;
      if (cs.machine) {
        hostName = cs.machine;
      }
      let userName = cInfo.userName;
      if (cs.osUser) {
        userName = cs.osUser;
      }
      const cid = `(CID=(PROGRAM=${pgmName})(HOST=${hostName})(USER=${userName}))`;
      cOpts[i].CNdata.push(NavSchemaObject.CD);
      cOpts[i].CNdata.push(this.connectData);
      cOpts[i].CNdata.push(cid);
      cOpts[i].CNdata.push(")");

      if (this.SID != null) {
        cOpts[i].sid = this.SID;
      }
      if (this.serviceName != null) {
        cOpts[i].service_name = this.serviceName;
      }
      if (this.instanceName != null) {
        cOpts[i].instance_name = this.instanceName;
      }
      // Close the description
      cOpts[i].CNdata.push(")");
      cOpts[i].done = true;
    }
  }

  getIntValue(stringInt, defaultValue) {
    if (/^\d+$/.test(stringInt))
      return parseInt(stringInt);
    return defaultValue;
  }

}

/**
 * Class that navigates descriptionlist node in a tree.
 */
class NavDescriptionList extends DescriptionList {
  constructor(activeChildren = new Array(), descProcessed = 0, done = 0) {
    super();
    this.activeChildren = activeChildren;
    this.descProcessed = descProcessed;
    this.done = done;
  }

  /**
 * Method decides how to traverse and sets the active children based on
 * the loadbalancing, failover values.
 * @param {object} cs
 */
  async navigate(cs) {
    cs.sBuf.push("(DESCRIPTION_LIST=");
    this.activeChildren = NavDescriptionList.setActiveChildren(this.children, this.failover, this.loadBalance);
    while (this.descProcessed < this.activeChildren.length) {
      await this.activeChildren[this.descProcessed].navigate(cs);
      this.descProcessed++;
    }

  }

  /** set active children based on lb and failover values.
   * @param children
   * @param failover
   * @param loadBalance
   */
  static setActiveChildren(children, failover, loadBalance) {
    let randNumber;
    const listSize = children.length;
    let tmpChildren = new Array();
    const rand = Math.floor(Math.random() * 10);
    const arr = new Array(listSize).fill(false);

    if (failover) {
      if (loadBalance) {
        for (let i = 0; i < listSize; i++) {
          do {
            randNumber = Math.abs(Math.floor(Math.random() * 10)) % listSize;
          } while (arr[randNumber]);
          arr[randNumber] = true;
          tmpChildren.push(children[randNumber]);
        }
      } else {
        tmpChildren = children;
      }
    } else {          // not failover
      if (loadBalance) {
        randNumber = Math.abs(rand) % listSize;
        tmpChildren.push(children[randNumber]);
      } else {
        tmpChildren.push(children[0]);
      }
    }

    return (tmpChildren);

  }

}
module.exports = {NavAddress, NavAddressList, NavDescription, NavDescriptionList};
