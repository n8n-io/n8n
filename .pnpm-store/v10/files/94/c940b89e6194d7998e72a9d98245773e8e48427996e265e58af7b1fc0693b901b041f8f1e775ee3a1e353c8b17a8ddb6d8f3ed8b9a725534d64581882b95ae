import { CookieJar } from "cookiejar";
import methods = require("methods");
import AgentBase = require("../agent-base");
import request = require("../..");
import { AgentOptions, CBHandler } from "../../types";

type Request = InstanceType<typeof request.Request>;

type HttpMethod = (url: string, callback?: CBHandler) => Request;

type AgentMethods = {
    [key in typeof methods[number]]: HttpMethod;
};

declare class Agent<Req extends Request = Request> extends AgentBase implements AgentMethods {
    constructor(options?: AgentOptions);

    jar: CookieJar;

    "M-SEARCH"(url: string, callback?: CBHandler): Req;

    "m-search"(url: string, callback?: CBHandler): Req;

    ACL(url: string, callback?: CBHandler): Req;

    BIND(url: string, callback?: CBHandler): Req;

    CHECKOUT(url: string, callback?: CBHandler): Req;

    CONNECT(url: string, callback?: CBHandler): Req;

    COPY(url: string, callback?: CBHandler): Req;

    DELETE(url: string, callback?: CBHandler): Req;

    GET(url: string, callback?: CBHandler): Req;

    HEAD(url: string, callback?: CBHandler): Req;

    LINK(url: string, callback?: CBHandler): Req;

    LOCK(url: string, callback?: CBHandler): Req;

    MERGE(url: string, callback?: CBHandler): Req;

    MKACTIVITY(url: string, callback?: CBHandler): Req;

    MKCALENDAR(url: string, callback?: CBHandler): Req;

    MKCOL(url: string, callback?: CBHandler): Req;

    MOVE(url: string, callback?: CBHandler): Req;

    NOTIFY(url: string, callback?: CBHandler): Req;

    OPTIONS(url: string, callback?: CBHandler): Req;

    PATCH(url: string, callback?: CBHandler): Req;

    POST(url: string, callback?: CBHandler): Req;

    PROPFIND(url: string, callback?: CBHandler): Req;

    PROPPATCH(url: string, callback?: CBHandler): Req;

    PURGE(url: string, callback?: CBHandler): Req;

    PUT(url: string, callback?: CBHandler): Req;

    REBIND(url: string, callback?: CBHandler): Req;

    REPORT(url: string, callback?: CBHandler): Req;

    SEARCH(url: string, callback?: CBHandler): Req;

    SOURCE(url: string, callback?: CBHandler): Req;

    SUBSCRIBE(url: string, callback?: CBHandler): Req;

    TRACE(url: string, callback?: CBHandler): Req;

    UNBIND(url: string, callback?: CBHandler): Req;

    UNLINK(url: string, callback?: CBHandler): Req;

    UNLOCK(url: string, callback?: CBHandler): Req;

    UNSUBSCRIBE(url: string, callback?: CBHandler): Req;

    acl(url: string, callback?: CBHandler): Req;

    bind(url: string, callback?: CBHandler): Req;

    checkout(url: string, callback?: CBHandler): Req;

    connect(url: string, callback?: CBHandler): Req;

    copy(url: string, callback?: CBHandler): Req;

    delete(url: string, callback?: CBHandler): Req;

    del(url: string, callback?: CBHandler): Req;

    get(url: string, callback?: CBHandler): Req;

    head(url: string, callback?: CBHandler): Req;

    link(url: string, callback?: CBHandler): Req;

    lock(url: string, callback?: CBHandler): Req;

    merge(url: string, callback?: CBHandler): Req;

    mkactivity(url: string, callback?: CBHandler): Req;

    mkcalendar(url: string, callback?: CBHandler): Req;

    mkcol(url: string, callback?: CBHandler): Req;

    move(url: string, callback?: CBHandler): Req;

    notify(url: string, callback?: CBHandler): Req;

    options(url: string, callback?: CBHandler): Req;

    patch(url: string, callback?: CBHandler): Req;

    post(url: string, callback?: CBHandler): Req;

    propfind(url: string, callback?: CBHandler): Req;

    proppatch(url: string, callback?: CBHandler): Req;

    purge(url: string, callback?: CBHandler): Req;

    put(url: string, callback?: CBHandler): Req;

    rebind(url: string, callback?: CBHandler): Req;

    report(url: string, callback?: CBHandler): Req;

    search(url: string, callback?: CBHandler): Req;

    source(url: string, callback?: CBHandler): Req;

    subscribe(url: string, callback?: CBHandler): Req;

    trace(url: string, callback?: CBHandler): Req;

    unbind(url: string, callback?: CBHandler): Req;

    unlink(url: string, callback?: CBHandler): Req;

    unlock(url: string, callback?: CBHandler): Req;

    unsubscribe(url: string, callback?: CBHandler): Req;
}

export = Agent;
