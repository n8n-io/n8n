const { HttpRequestManager , request , get , http , https} = require('../../lib/index');
const requestModule = require('request');

const {Http2Debug} = require('http2-debug');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-spies'));

const httpModule = require('http');
const SERVER_HOST = '0.0.0.0';

const HTTP_PORT = 8080;
const HTTP2_PORT = 8443;

const HTTP_URL = `http://${SERVER_HOST}:${HTTP_PORT}`;
const HTTP2_URL = `https://${SERVER_HOST}:${HTTP2_PORT}`;

const serverCloseActions = [];

const onHttpServerReady = new Promise((resolve , reject)=>{
    try{
        const server = httpModule.createServer((req, res) => {
            getBody(req)
            .then((bodyRaw)=>{
                const body = JSON.parse(bodyRaw ? bodyRaw : "{}");
                const headers = req.headers;

                if (req.url.indexOf('delay')!=-1){
                    setTimeout(respond,100);
                }
                else respond();
                function respond(){
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        path : req.url,
                        method : req.method,
                        body,
                        headers
                    }));
                }
                
            })
            .catch((err)=>{
                res.status(500).end('')
            })
        });
        server.listen(HTTP_PORT,SERVER_HOST, (err) => {
            if (err)
                return reject(err);

            serverCloseActions.push(server.close.bind(server));
            resolve()
        });
    }
    catch(err){
        reject(err);
    }
});
const onHTTP2ServerReady = new Promise((resolve , reject)=>{
    class HTTP2StubServer extends Http2Debug{
        onStream(stream , headers){
            const args = arguments;
            if (headers[':path'].indexOf('delay')!=-1){
                setTimeout(()=> super.onStream.apply(this,args),100 )
            }
            else{
                super.onStream.apply(this,args);
            }
        }
    }
    http2Debug = new HTTP2StubServer;
    http2Debug.createServer((err)=>{
        if (err)
            return reject(err);
        resolve();
        serverCloseActions.push(http2Debug.stopServer.bind(http2Debug));
    });
})

describe('e2e' , ()=>{
    before(()=>{
        return Promise.all([
            onHTTP2ServerReady,
            onHttpServerReady
        ])
    })
    describe('third party validation' ,()=>{
        let requestWithHttp2Client;
        before(()=>{

            requestWithHttp2Client = requestModule.defaults({
                httpModules : {
                    'http:' : http,
                    'https:' : https,
                }
            });
        })
        it('http1 request module should be able to make post request with json body' , async ()=>{
            return new Promise((resolve,reject)=>{
                requestWithHttp2Client({
                    uri : `${HTTP_URL}/test1`,
                    method : 'post',
                    json:{
                        name : 'test1'
                    },
                    headers : {
                        'tesT-me' :'90'
                    }
                }, function (error, response, body) {
                    if (error)
                        return reject(err);
                    try{
                        expect(body.body.name).eq('test1');
                        expect(body.headers['test-me']).eq('90');
                        expect(response.statusCode).eq(200);
                        expect(response.body.method).eq('POST');
                        resolve();
                    }
                    catch(err){
                        reject(err);
                    }
                   
                });
            })
        })
        it('http2 request module should be able to make post request with json body' , async ()=>{
            return new Promise((resolve,reject)=>{
                requestWithHttp2Client({
                    uri : `${HTTP2_URL}/test1`,
                    method : 'post',
                    json:{
                        name : 'test1'
                    },
                    headers : {
                        'tesT-me' :'90'
                    }
                }, function (error, response, respBody) {
                    if (error)
                        return reject(error);
                    try{
                        const json = JSON.parse(respBody.body);
                        expect(json.name).eq('test1');
                        expect(respBody.headers['test-me']).eq('90');
                        expect(response.statusCode).eq(200);
                        expect(respBody.headers[':method']).eq('POST');
                        resolve();
                    }
                    catch(err){
                        reject(err);
                    }
                   
                });
            })
        })
    })
    
    describe('request' , ()=>{
        describe('http1' , ()=>{
            it('Should be able to make request with request options as a string' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request(`${HTTP_URL}/test1` , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                })
            });
            it('Should be able to make request with request options and url as a string' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request(`${HTTP_URL}/test1` , { method : 'POST'}, (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('POST');
                            expect(json.body.test).eq(1);
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.write('{"test":1}')
                    req.end();
                })
            });
            it('Should be able to make request with request options and method lowercase' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request({
                        path : '/test1',
                        host : SERVER_HOST,
                        port : HTTP_PORT,
                        method : 'post'
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('POST');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                })
            });
            it('Should be able to make request with request options and headers' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request({
                        path : '/test1',
                        host : SERVER_HOST,
                        port : HTTP_PORT,
                        method : 'delete',
                        headers : {
                            'tesT-me' :'90'
                        }
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(json.headers['test-me']).eq('90');
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('DELETE');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                })
            });
            it('Should be able to abort immediately' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request({
                        path : '/delay',
                        host : SERVER_HOST,
                        port : HTTP_PORT,
                        method : 'delete',
                        headers : {
                            'tesT-me' :'90'
                        }
                    } , (res)=>{
                        reject(new Error('Rejected request shouldn\'t respond'))
                    });
                    req.on('error' , (err)=>{
                        try{
                            expect(err.code).eq('ECONNRESET');
                            resolve();
                        }
                        catch(err){
                            reject(err);
                        }
                    })
                    req.end();
                    req.setTimeout(1,()=>{
                        try{
                            req.abort();
                            resolve();
                        }
                        catch(err){
                            reject(err)
                        }
                    }) 
                })
            });
            it('Emits network error on client request' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request({
                        path : '/',
                        host : SERVER_HOST,
                        port : 54321,
                        method : 'GET'
                    });
                    req.on('error', (err)=>{
                        try{
                            expect(err.code).eq('ECONNREFUSED');
                            resolve();
                        }
                        catch(err){
                            reject(err);
                        }
                    });
                    req.end();
                    setTimeout(reject, 100);
                })
            });
        })
        describe('http2' , ()=>{
            it('Should be able to make request with request options with body' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request({
                        path : '/test1',
                        protocol : 'https:',
                        host : SERVER_HOST,
                        port : HTTP2_PORT,
                        method : 'POST',
                        headers : {
                            'test-me' : 90
                        }
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(json.headers['test-me']).eq('90');
                            expect(res.statusCode).eq(200);
                            expect(json.headers[':path']).eq('/test1');
                            expect(json.headers[':method']).eq('POST');
                            expect(JSON.parse(json.body).test).eq(1);
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.write('{"test":1}');
                    req.end();
                })
            });

            it('Should be able to abort immediately' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request({
                        path : '/delay',
                        host : SERVER_HOST,
                        port : HTTP2_PORT,
                        method : 'delete',
                        headers : {
                            'tesT-me' :'90'
                        }
                    } , (res)=>{
                        reject(new Error('Rejected request shouldn\'t respond'))
                    });
                    req.on('error' , (err)=>{
                        try{
                            expect(err.code).eq('ECONNRESET');
                            resolve();
                        }
                        catch(err){
                            reject(err);
                        }
                    })
                    req.end();
                    req.setTimeout(1,()=>{
                        req.abort()
                    }) 
                })
            });

            it('Should be able to make request with request options and url as string' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request(HTTP2_URL , {
                        path : '/test1',
                        host : SERVER_HOST,
                        method : 'POST',
                        protocol : 'https:',
                        port : HTTP2_PORT,
                        headers : {
                            'tesT-me' :'90'
                        }
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(json.headers['test-me']).eq('90');
                            expect(res.statusCode).eq(200);
                            expect(json.headers[':path']).eq('/test1');
                            expect(json.headers[':method']).eq('POST');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                });
            });
            it('Should be able to make request with request as string' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = request(`${HTTP2_URL}/test1`, (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.headers[':path']).eq('/test1');
                            expect(json.headers[':method']).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                });
            });
        });
    });

    describe('validate http1 interface as assumed' , ()=>{
        describe('http1' , ()=>{
            it('Should be able to make request with request options as a string' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = require('http').request(`${HTTP_URL}/test1` , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                })
            });
            /*
            For now disabled the following test after verified that
            It's working on various machines and on travis only it doesn't.
            If someone have idea why only travis then help is welcome.
            */
            // it('Should be able to make request with request options and url as a string' , ()=>{
            //     return new Promise((resolve , reject)=>{
            //         const req = require('http').request(
            //             `${HTTP_URL}/test1` ,
            //              { method : 'POST'},
            //             (res)=>{
            //                 getBody(res)
            //                 .then((bodyRaw)=>{
            //                     const json = JSON.parse(bodyRaw);
            //                     expect(res.statusCode).eq(200);
            //                     expect(json.path).eq('/test1');
            //                     expect(json.method).eq('POST');
            //                     expect(json.body.test).eq(1);
            //                     resolve();
            //                 })
            //                 .catch((err)=>{
            //                     reject(err)
            //                 })
            //             });
            //             req.write('{"test":1}')
            //             req.end();
            //     })
            // });
            it('Should be able to make request with request options and method lowercase' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = require('http').request({
                        path : '/test1',
                        host : SERVER_HOST,
                        port : HTTP_PORT,
                        method : 'post'
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('POST');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                })
            });
            it('Should be able to make request with request options and headers' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = require('http').request({
                        path : '/test1',
                        host : SERVER_HOST,
                        port : HTTP_PORT,
                        method : 'delete',
                        headers : {
                            'tesT-me' :'90'
                        }
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(json.headers['test-me']).eq('90');
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('DELETE');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                })
            });
            it('Should be able to abort immediately' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = require('http').request({
                        path : '/delay',
                        host : SERVER_HOST,
                        port : HTTP_PORT,
                        method : 'delete',
                        headers : {
                            'tesT-me' :'90'
                        }
                    } , (res)=>{
                        reject(new Error('Rejected request shouldn\'t respond'))
                    });
                    req.on('error' , (err)=>{
                        try{
                            expect(err.code).eq('ECONNRESET');
                            resolve();
                        }
                        catch(err){
                            reject(err);
                        }
                    })
                    req.end();
                    req.setTimeout(1,()=>{
                        req.abort()
                    }) 
                })
            });
            it('Should emit' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = require('http').request({
                        path : '/delay',
                        host : SERVER_HOST,
                        port : HTTP_PORT,
                        method : 'delete',
                        headers : {
                            'tesT-me' :'90'
                        }
                    } , (res)=>{
                        reject(new Error('Rejected request shouldn\'t respond'))
                    });
                    req.on('error' , (err)=>{
                        try{
                            expect(err.code).eq('ECONNRESET');
                            resolve();
                        }
                        catch(err){
                            reject(err);
                        }
                    })
                    req.end();
                    req.setTimeout(1,()=>{
                        try{
                            req.abort();
                            resolve();
                        }
                        catch(err){
                            reject(err)
                        }
                    }) 
                })
            });
        });
    });
    
    describe('get' , ()=>{
        before(()=>{
            return Promise.all([
                onHTTP2ServerReady,
                onHttpServerReady
            ])
        });
        describe('http1' , ()=>{
            it('Should be able to make request with request options as a string' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = get(`${HTTP_URL}/test1` , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                })
            });
            it('Should be able to make request with request options and url as a string' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = get(`${HTTP_URL}/test1` , { method : 'POST'}, (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                    req.end();
                })
            });
            it('Should be able to make request with request options method lowercase' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = get({
                        path : '/test1',
                        host : SERVER_HOST,
                        port : HTTP_PORT,
                        method : 'post'
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                })
            });
            it('Should be able to make request with request options and headers' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = get({
                        path : '/test1',
                        host : SERVER_HOST,
                        port : HTTP_PORT,
                        method : 'delete',
                        headers : {
                            'tesT-me' :'90'
                        }
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(json.headers['test-me']).eq('90');
                            expect(res.statusCode).eq(200);
                            expect(json.path).eq('/test1');
                            expect(json.method).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                })
            });
        })
        describe('http2' , ()=>{
            it('Should be able to make request with request options and headers' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = get({
                        path : '/test1',
                        protocol : 'https:',
                        host : SERVER_HOST,
                        port : HTTP2_PORT,
                        method : 'POST',
                        headers : {
                            'test-me' : 90
                        }
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(json.headers['test-me']).eq('90');
                            expect(res.statusCode).eq(200);
                            expect(json.headers[':path']).eq('/test1');
                            expect(json.headers[':method']).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                })
            });
            
            it('Should be able to make request with request options and url as string' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = get(HTTP2_URL , {
                        path : '/test1',
                        host : SERVER_HOST,
                        method : 'POST',
                        protocol : 'https:',
                        port : HTTP2_PORT,
                        headers : {
                            'tesT-me' :'90'
                        }
                    } , (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(json.headers['test-me']).eq('90');
                            expect(res.statusCode).eq(200);
                            expect(json.headers[':path']).eq('/test1');
                            expect(json.headers[':method']).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                });
            });
            it('Should be able to make request with request as string and body' , ()=>{
                return new Promise((resolve , reject)=>{
                    const req = get(`${HTTP2_URL}/test1`, (res)=>{
                        getBody(res)
                        .then((bodyRaw)=>{
                            const json = JSON.parse(bodyRaw);
                            expect(res.statusCode).eq(200);
                            expect(json.headers[':path']).eq('/test1');
                            expect(json.headers[':method']).eq('GET');
                            resolve();
                        })
                        .catch((err)=>{
                            reject(err)
                        })
                    });
                });
            });
        });
    });
    

    after(async ()=>{
       return new Promise((resolve)=>{
            serverCloseActions.forEach((action)=>{
                action();
            });
            setTimeout(resolve , 100)
       })
    })
})

function getBody(stream){
    return new Promise((resolve , reject)=>{
        let bodyRaw = '';
        stream.on('data' , (chunk)=>{
            bodyRaw+=chunk;
        });
        stream.on('end',(chunk)=>{
            if (chunk)
                bodyRaw+=chunk;
            resolve(bodyRaw);
        });
        stream.on('error' , (err)=>{
            reject(err)
        })
    })
}
