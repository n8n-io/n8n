
const { URL } = require('url');
const {EventEmitter} = require('events');
const _extend = require('util')._extend;
const {DebounceTimers , assertIsObject , ERR_INVALID_ARG_TYPE} = require('./utils');
const {initializeTLSOptions } = require('./request-options');
const http = require('http');
const https = require('https');
const {Stream} = require('stream');
function addFunctions(container , obj){
  const proto = obj.prototype;
  Object.keys(proto).forEach((name)=>{
    if (container.indexOf(name)!=-1)
    return;
    if (name.indexOf('_')!=0 && typeof proto[name] == 'function'){
      container.push(name);
    }
  })
}
const STUBBED_METHODS_NAME = [ 
]
//We need to proxy all v1 function
addFunctions(STUBBED_METHODS_NAME, http.ClientRequest);
addFunctions(STUBBED_METHODS_NAME, http.OutgoingMessage);
addFunctions(STUBBED_METHODS_NAME, EventEmitter);
addFunctions(STUBBED_METHODS_NAME, Stream);

const PROPERTIES_TO_PROXY = [
  'httpVersionMajor',
  'httpVersionMinor',
  'httpVersion',
];
const HEADERS_TO_REMOVE = ['host' , 'connection']

const $stubs = Symbol('stubs');

function ClientRequest(){
  this.http2Mimic = true;
  this[$stubs] = [];
    for (var i=0;i<STUBBED_METHODS_NAME.length;i++){
      let name = STUBBED_METHODS_NAME[i];
      if (!ClientRequest.prototype[name]){
        this[name] = function method(){
          return this.genericStubber(name , arguments);
        }.bind(this);
      }
    }

    var requestOptions , cb,url , args;
    const isInternal = arguments[0] instanceof RequestInternalEnforce;
    var isInternalMethod,isInternalProtocol;
    if (isInternal){
      const enforceOptions = arguments[0];
      if ( enforceOptions.method)
        isInternalMethod = enforceOptions.method;
      if ( enforceOptions.protocol)
        isInternalProtocol = enforceOptions.protocol;
    }
    if (isInternal){
      args = arguments[0].args;
    }
    else{
      args = arguments;
    }
    if (args[2] != undefined){
      url = args[0];
      requestOptions = args[1];
      cb = args[2];
    }
    else if(args[1] == undefined){
      requestOptions = args[0];
    }
    else{
      requestOptions = args[0];
      cb = args[1];
    }
    cb = cb || function dummy(){};

    if (typeof requestOptions === 'string') {
      requestOptions = urlToOptions(new URL(requestOptions));
      if (!requestOptions.hostname) {
        throw new Error('Unable to determine the domain name');
      }
    }
    else {
      if (url){
        requestOptions = _extend(urlToOptions(new URL(url)), requestOptions);
      }
      else{
        requestOptions = _extend({}, requestOptions);
      }
    }

    if (isInternalProtocol!=isInternalProtocol){
      requestOptions.protocol = isInternalProtocol;
    }

    if (requestOptions.protocol == 'https:' && !requestOptions.port && requestOptions.port !=0)
      requestOptions.port = 443;
      
    if (!requestOptions.port && requestOptions.port !=0)
      requestOptions.port = 80;
      
    if (isInternalMethod){
      requestOptions.method = isInternalMethod;
    }
    else if (!requestOptions.method )
      requestOptions.method = 'GET';

    requestOptions.method = requestOptions.method.toUpperCase();

    const requestManager = requestOptions.requestManager || this.getGlobalManager(requestOptions);
    requestManager.handleClientRequest(this , requestOptions , cb);
}
ClientRequest.prototype = {
  getGlobalManager(options){
    if (options.agent)
      return (options.agent.protocol == 'https:' ? HttpsRequest.globalManager : HttpRequest.globalManager);
    else
      return HttpRequestManager.globalManager;
  },
  genericStubber(method , args){
    if (this[$stubs ]){
      this[$stubs].push([method,args]);
      return true;
    }
    else
      return this[method](...arguments);
  },
  on(eventName , cb){
    if (eventName == 'response'){
      if (!cb.http2Safe){
        eventName = 'http1.response';
        arguments[0] = eventName;
      }
    }
    if (this._on){
      this._on(...arguments);
    }
    else
      this.genericStubber('on' , arguments);

  },
  once(eventName , cb){
    if (eventName == 'response'){
      if (!cb.http2Safe){
        eventName = 'http1.response';
      }
    }
    if (this._once){
      this._once(...arguments);
    }
    else
      this.genericStubber('once' , arguments);

  },
  emitError(error) {
    if (this[$stubs]){
      this[$stubs].forEach(([method, args]) => {
        if ((method === 'on' || method === 'once') && args[0] === 'error') {
          args[1](error);
        }
      });
    }
    else
      return this.emit('error', error);
  },
  take(stream){
    //We forward all functions to the stream
    for (var i=0;i<STUBBED_METHODS_NAME.length;i++){
      let name = STUBBED_METHODS_NAME[i];
      if (stream[name]){
        this[name] = stream[name].bind(stream);
      }
      // else{
      //   throw new Error(`for stub ${name} no original method found`)
      // }
    }
    this._on = stream.on.bind(stream);
    this._once = stream.once.bind(stream);
    this.proxyProps(stream);
    //This should come later in case of user exception
    //We trigger the all the stubs that were generted before
    for (let i = 0; i<this[$stubs ].length;i++){
      var stub = this[$stubs ][i];
      stream[stub[0]](...stub[1]);
    }
    this[$stubs] = null;
  },
  proxyProps(http2Stream){
    function getter(){
      return http2Stream[this];
    }
    function setter(value){
      http2Stream[this] = value;
    }
    const notToProxy = ['on' , '_on','_once' , 'once','http2Mimic'].concat(STUBBED_METHODS_NAME);
    const keys = Object.keys(this);
    const keysToProxy = [].concat(PROPERTIES_TO_PROXY);
    keys.forEach(function whichProxyKeys(key){
      if (notToProxy.indexOf(key) == -1 && keysToProxy.indexOf(key)==-1){
        keysToProxy.push(key)
      }
    });
    const properties = Object.getOwnPropertyDescriptors(http2Stream);
    for (var i=0;i<keysToProxy.length;i++){
      let name = keysToProxy[i];
      const propConfig = properties[name];
      let shouldCopyValue;
      if (!propConfig)
        shouldCopyValue = true;
      if (propConfig && (propConfig.writable || propConfig))
        shouldCopyValue = true;
      
      if (shouldCopyValue)
        http2Stream[name] = this[name];

      Object.defineProperty(this , name , {
        get : getter.bind(name),
        set : setter.bind(name),
      })
    }
      
  }
}


class HttpRequestManager extends EventEmitter{
  constructor(options){
    super(); 
    this.httpsAgent = https.globalAgent;
    this.httpAgent = http.globalAgent;
    this.init(options);
  }
  log(){
  }
  init(options){
    options = options || {};
    this.http2Clients = {};
    this.cachedHTTP1Result = {};
    this.setModules();
    this.http2Debouncer = new DebounceTimers(function stopConnection(key){
      this.log('stopping ' , key);
      var foundConnection = this.http2Clients[key];
      if (foundConnection){
        this.removeHttp2Client(key , foundConnection)
      }
    }.bind(this) , 1000);

    this.keepH1IdentificationCacheFor = options.keepH1IdentificationCacheFor || 30000;
    //the debouncer will accept only values greater then zero
    this.http2Debouncer.setDelay(options.keepH2ConnectionFor);
    if (options.useHttp){
      this.enforceProtocol = 'http:';
    }
    else if(options.useHttps){
      this.enforceProtocol = 'https:';
    }
  }
  setModules() {
    this['http'] = require('http');
    this['https'] = require('https');
    this['tls'] = require('tls');
    this['net'] = require('net');
    this.http2Support = false;
    try{
      this['http2'] = require('http2');
      this.http2Support = true;
    }
    catch(err){
      //It will automatically fallback to http
    }
  }
  handleClientRequest(clientRequest , requestOptions ,cb){
    const requestManager = this;
    const clientKey = requestManager.getClientKey(requestOptions);

    if (requestManager.hasCachedConnection(clientKey)){
      const socket = requestManager.getHttp2Client(clientKey);
      const connectionOptions = {
        createConnection(){
          return socket;
        }
      };
      process.nextTick(function onMakeRequest(){
        requestManager.makeRequest( clientRequest ,clientKey  , requestOptions, cb , connectionOptions);
      }.bind(requestManager)) 
    }
    else 
      requestManager.holdConnectionToIdentification(clientKey , requestOptions , function onIdentification(error , connectionOptions){
        if (error) {
          clientRequest.emitError(error);
          return;
        }

        requestManager.makeRequest(clientRequest , clientKey , requestOptions, cb , connectionOptions);
      }.bind(requestManager));
  }
  getClientKey(url){
    return `${url.protocol || this.enforceProtocol}${url.servername || url.host || url.hostname}:${url.port}`;
  }
  getHttp2Client(clientKey){
    return this.http2Clients[clientKey];
  }
  setHttp2Client(clientKey , client){
    const httpManager = this;
    const prevClient = httpManager.http2Clients[clientKey];
    if (prevClient)
      httpManager.removeHttp2Client(clientKey , prevClient);
    httpManager.http2Clients[clientKey] = client;

    function closeClient(){
      httpManager.removeHttp2Client(clientKey , client);
    }
    client.on('close' , closeClient);
    client.on('goaway' , closeClient);
    client.on('error' , closeClient);
    client.on('frameError' , closeClient);
    client.on('timeout' , closeClient);

  }
  removeHttp2Client(clientKey , client){
    try{
      delete this.http2Clients[clientKey];
      if (!client.closed){
        client.close();
      }
    }
    catch(err){
     
    }
    client.removeAllListeners('close');
    client.removeAllListeners('error');
    client.removeAllListeners('frameError');
    client.removeAllListeners('timeout');
  }
  request(url, options, cb){
    var args = new RequestInternalEnforce(arguments);
    if (this.enforceProtocol){
      args.protocol = this.enforceProtocol;
    }
    return new ClientRequest(args)
  }
  get(){
    var args = new RequestInternalEnforce(arguments);
    args.method = 'GET';
    var request = this.request(args);
    request.end();
    return request;
  }
  hasCachedConnection(clientKey){
    const http2Client = this.getHttp2Client(clientKey);  
    if (http2Client){
        return true;
    }
    return this.cachedHTTP1Result[clientKey] + this.keepH1IdentificationCacheFor < Date.now();
  }
  makeRequest(inStream , clientKey  , requestOptions ,cb  , connectionOptions){
    const http2Client = this.getHttp2Client(clientKey);  
    if (http2Client){
        return this.makeHttp2Request(clientKey , inStream , http2Client ,Object.assign(connectionOptions || {}, requestOptions), cb);
    }
    //It's http1.1 let Node.JS core manage it
    if (!requestOptions.agent){
      if (requestOptions.protocol == 'https:')
        requestOptions.agent = this.httpsAgent;
      else
        requestOptions.agent = this.httpAgent;
    }
    return this.makeHttpRequest(clientKey , inStream , requestOptions ,cb , connectionOptions);
  }
  holdConnectionToIdentification(clientKey , requestOptions  , cb){
    const topic = `identify-${clientKey}`;
    //If there are any pending identification process let's wait for one to finish
    if (this._events[topic])
      this.once(topic , cb); //There is.. let's wait
    else{
      //We will need to start identification
      this.once(topic , function letKnowThereIsAnEvent(){}); //There is.. let's wait
      const socket = this.identifyConnection(requestOptions , function onIdentify(error , type){
        if (error) {
          return cb(error);
        }

        var options = {
          createConnection(){
            return socket;
          }
        }
        if ( type == 'h2' && this.http2Support){
          var http2Client  = this.http2.connect(requestOptions ,options);
          this.setHttp2Client(clientKey , http2Client);
        }
        else{
          //This is http1.1
          //Cache last result time
          this.cachedHTTP1Result[clientKey] = Date.now();
          //Continue let core handle http1.1
        }
        cb(null, options);
        this.emit(topic , options);
      }.bind(this))
    }
    
  }
  makeHttpRequest(clientKey , inStream , options , cb , connectionOptions){
    if (options instanceof URL)
      options = urlToOptions(options);

    const h1op = _extend({} , options);
    if (connectionOptions)
      h1op.createConnection = connectionOptions.createConnection;

    const requestModule = h1op.protocol == 'https:' ? this.https : this.http;
    const req = requestModule.request(h1op ,cb);
 
    inStream.take(req);
    inStream._on('response' , function onHttp1Response(v){this.emit('http1.response' , v)})

  }
  makeHttp2Request(clientKey , inStream , http2Client , requestOptions , cb){
      var http2Debouncer = this.http2Debouncer;
      http2Debouncer.pause(clientKey);
      var headers =  _extend({} , requestOptions.headers || {});
      if (requestOptions.method)
        headers[':method'] = requestOptions.method; 
      if (requestOptions.path)
        headers[':path'] = requestOptions.path;

      Object.keys(headers).forEach((key)=>{
          if (HEADERS_TO_REMOVE.indexOf( (key+'').toLowerCase() ) !=-1){
            delete headers[key];
          }
      })
      requestOptions.headers = headers;
      var req =  http2Client.request(
        headers
      );
      inStream.emit('socket' , requestOptions.createConnection());

      let maxContentLength;
      let currentContent = 0;
 
      req.on('data' , function onData(data){
        currentContent+=data.length;
        if (currentContent>= maxContentLength)
          http2Debouncer.unpauseAndTime(clientKey);
      })
      inStream.take(req);
      function onResponse(headers){
        maxContentLength = parseInt(headers['content-length']);
        if (maxContentLength < 0 )
          this.http2Debouncer.unpauseAndTime(clientKey);

        HttpRequestManager.httpCompatibleResponse(req , requestOptions , headers);
        inStream.emit('http1.response' , req);
        if (cb)
          cb(req);
      }
      onResponse.http2Safe = true;
      req.once('response' , onResponse.bind(this));
  }
  static httpCompatibleResponse(res , requestOptions , headers){
    res.httpVersion = '2.0';
    res.rawHeaders = headers;
    res.headers = headers;
    res.statusCode = headers[':status'];
    delete headers[':status'];
  }
  identifyConnection(requestOptions , cb){
    var socket = this.connect( requestOptions, { allowHTTP1: true }, function onConnect(){
      socket.removeListener('error', cb);

      if (socket.alpnProtocol == 'h2'){
        cb(null, 'h2')
      }
      else{
        //close http1.1 connection is it cannot be reused
        socket.end();
        cb(null, 'h1')
      }
    });
    socket.on('error', cb);
    return socket;
  }
  connect(authority, options, listener) {
    if (typeof options === 'function') {
      listener = options;
      options = undefined;
    }
  
    assertIsObject(options, 'options');
    options = Object.assign({}, options);
  
    if (typeof authority === 'string')
      authority = new URL(authority);
  
    assertIsObject(authority, 'authority', ['string', 'Object', 'URL']);
  
    var protocol = authority.protocol || options.protocol || (this.enforceProtocol != 'detect' ? this.enforceProtocol : null) || 'http:';
    var port = '' + (authority.port !== '' ?
      authority.port : (authority.protocol === 'http:' ? 80 : 443));
    var host = authority.hostname || authority.host || 'localhost';
  
    var socket;
    if (typeof options.createConnection === 'function') {
      socket = options.createConnection(authority, options);
    } else {
      switch (protocol) {
        case 'http:':
           socket = this.net.connect(port, host , listener);
          break;
        case 'https:':
           socket = this.tls.connect(port, host, initializeTLSOptions.call(this , options, host) , listener);
          break;
        default:
          throw new Error('Not supprted' + protocol);
      }
    }
    return socket;
  }
}
function urlToOptions(url) {
  var options = {
    protocol: url.protocol,
    hostname: url.hostname,
    hash: url.hash,
    search: url.search,
    pathname: url.pathname,
    path: `${url.pathname}${url.search}`,
    href: url.href
  };
  if (url.port !== '') {
    options.port = Number(url.port);
  }
  if (url.username || url.password) {
    options.auth = `${url.username}:${url.password}`;
  }
  return options;
}
class RequestInternalEnforce{
  constructor(args){
    if (args[0] instanceof RequestInternalEnforce){
      return args[0];
    }
    this.args = args;
    this.method = null;
    this.protocol = null;
  }
}

class HttpsRequest extends HttpRequestManager{
    constructor(){
        super(...arguments);
        this.Agent = https.Agent;
        this.globalAgent = https.globalAgent;
        this.enforceProtocol = 'https:';
    }
}
const httpsRequestSinglton = new HttpsRequest;
HttpsRequest.globalManager = httpsRequestSinglton;
HttpsRequest.Manager = HttpsRequest;

class HttpRequest extends HttpRequestManager{
    constructor(){
        super(...arguments);
        this.Agent = http.Agent;
        this.globalAgent = http.globalAgent;
        this.enforceProtocol = 'http:';
    }
}
const httpRequestSinglton = new HttpRequest;
HttpRequest.globalManager = httpRequestSinglton;
HttpRequest.Manager = HttpRequest;

const singeltonHttpManager = new HttpRequestManager();
singeltonHttpManager.enforceProtocol = 'detect';
HttpRequestManager.globalManager = singeltonHttpManager;

module.exports = {
  HttpRequest,
  HttpsRequest,
  HTTP2OutgoingMessage : ClientRequest,
  ClientRequest,
  HttpRequestManager
}
