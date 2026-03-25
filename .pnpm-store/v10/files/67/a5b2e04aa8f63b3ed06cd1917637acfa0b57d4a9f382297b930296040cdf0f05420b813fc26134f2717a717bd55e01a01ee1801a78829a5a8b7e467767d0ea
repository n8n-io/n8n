import { EventEmitter } from "events";
import { Stats } from "fs";


/*~ This declaration specifies that the function
 *~ is the exported object from the file
 */
export = walkdir;


declare function walkdir(
    path:string,
    options:{sync:true,return_object:true}&walkdir.WalkOptions, 
    eventListener?:walkdir.WalkEventListener)
    :{[path:string]:Stats};
    
declare function walkdir(
    path:string,
    options:{sync:true,return_object?:false}&walkdir.WalkOptions, 
    eventListener?:walkdir.WalkEventListener)
    :string[];

declare function walkdir(
    path:string,
    options?:({sync?:false}&walkdir.WalkOptions)|walkdir.WalkEventListener, 
    eventListener?:walkdir.WalkEventListener)
    :walkdir.WalkEmitter;

declare function walkdir(
    path:string,
    options?:walkdir.WalkOptions|walkdir.WalkEventListener, 
    eventListener?:walkdir.WalkEventListener)
    :walkdir.WalkEmitter|string[]|{[path:string]:Stats};

/*~ If you want to expose types from your module as well, you can
 *~ place them in this block. Often you will want to describe the
 *~ shape of the return type of the function; that type should
 *~ be declared in here, as this example shows.
 */
declare namespace walkdir {
    export type WalkOptions = {
        /**
         * follow symlinks. default FALSE
         */
        "follow_symlinks"?: boolean,
        /**
         * only go one level deep. convenience param.
         */ 
        "no_recurse"?: boolean,
        /**
         * only travel to max depth. emits an error if hit.
         */
        "max_depth"?: number,
        /**
         * on filesystems where inodes are not unique like windows (or perhaps hardlinks) some files may not be emitted due to inode collision.
         * turning off this behavior may be required but at the same time may lead to hitting max_depth via link loop.
         */
        "track_inodes"?: boolean;
        /**
         * make this syncronous. the same as calling walkdir.sync
         */
        "sync"?:boolean,
        /**
         * return an object of {path:stat} instead of just the resolved path names
         */
        "return_object"?: boolean, // if true the sync return will be in {path:stat} format instead of [path,path,...]
        /**
         * dont build up an internal list or object of all of the paths. this can be an important optimization for listing HUGE trees.
         */
        "no_return"?: boolean,
        /**
         * filter. filter an array of paths from readdir
         */
        "filter"?:(directory:string,files:string[])=>string[]|Promise<string[]>,
        /**
         * provide an alternate implementation of fs like graceful-fs
         */
        "fs"?:any,
        /*** 
         * default True. if false this will use stat insteqad of lstat and not find links at all.
         */
        "find_links"?:boolean,
    }

  export type WalkEmitter = EventEmitter&{
        /**
         * cancel a walk in progress 
         */
        end():void
        /**
         * pause the walk
         */
        pause():void;
        /**
         * resume the walk
         */
        resume():void;
        /**
         * pass paths to ignore for the remainder of the walk. directories ignored will not have events emitted for any of their children.
         * @param paths string|string[]
         */
        ignore(paths:string|string[]):void;

        /**
         * emitted if there is an error from the file system reading the initial or target directory
         */
        on(event:"error",listener:(error:Error)=>void):WalkEmitter;
        /**
         *  emitted when there is an error from the filesystem reading as nested path.
         */
        on(event:"fail",listener:(path:string,error:Error)=>void):WalkEmitter;
        /**
         * the stat of the target directory. not emitted through any other event.
         */
        on(event:"targetdirectory",listener:(path:string,stat:Stats,depth:number)=>void):WalkEmitter;
        /**
         * helpful event that lets you know if a directory is empty
         */
        on(event:"empty",listener:(path:string,stat:Stats,depth:number)=>void):WalkEmitter;
        /**
         * found a path. this is the expected use case. every path for everything inside target directory is emitted here.
         */
        on(event:"path",listener:(this:WalkEmitter,path:string,stat:Stats,depth:number)=>void):WalkEmitter;
        /**
         * found a directory
         */
        on(event:"directory",listener:(path:string,stat:Stats,depth:number)=>void):WalkEmitter;
        /**
         * found a file
         */
        on(event:"file",listener:(path:string,stat:Stats,depth:number)=>void):WalkEmitter;
        /**
         * found a symlink
         */
        on(event:"link",listener:(path:string,stat:Stats,depth:number)=>void):WalkEmitter;
        /**
         * found a socket
         */
        on(event:"socket",listener:(path:string,stat:Stats,depth:number)=>void):WalkEmitter;
        /**
         * found a fifo
         */
        on(event:"fifo",listener:(path:string,stat:Stats,depth:number)=>void):WalkEmitter;
        /**
         * found a block device / disk
         */
        on(event:"blockdevice",listener:(path:string,stat:Stats,depth:number)=>void):WalkEmitter;
        /**
         * found a character device / tty / terminal
         */
        on(event:"characterdevice",listener:(path:string,stat:Stats,depth:number)=>void):WalkEmitter;
    };

    export type WalkEventListener = (this:WalkEmitter,path:string,stat:Stats,ignore:(path:string|string[])=>void)=>void

    // same a walkdir
    export function find(
        path:string,
        options:{sync:true,return_object:true}&walkdir.WalkOptions, 
        eventListener?:walkdir.WalkEventListener)
        :{[path:string]:Stats};
        
    export function find(
        path:string,
        options:{sync:true,return_object?:false}&walkdir.WalkOptions, 
        eventListener?:walkdir.WalkEventListener)
        :string[];
    
    export function find(
        path:string,
        options?:({sync?:false}&walkdir.WalkOptions)|walkdir.WalkEventListener, 
        eventListener?:walkdir.WalkEventListener)
        :walkdir.WalkEmitter;


    //always sync:true but otherwise the same as walkdir
    export function sync(path:string,options:walkdir.WalkOptions&{return_object:true},eventListener?:walkdir.WalkEventListener):{[path:string]:Stats};
    export function sync(path:string,options?:walkdir.WalkOptions&{return_object?:false},eventListener?:walkdir.WalkEventListener):string[];
    export function sync(path:string,options?:walkdir.WalkOptions&{return_object?:boolean},eventListener?:walkdir.WalkEventListener):string[]|{[path:string]:Stats};
    export function sync(path:string,eventListener?:walkdir.WalkEventListener):string[];

    // always sync:false. a promise of whatever is the same as walkdir.
    export function async(path:string,options:walkdir.WalkOptions&{return_object:true},eventListener?:walkdir.WalkEventListener):Promise<{[path:string]:Stats}>;
    export function async(path:string,options?:walkdir.WalkOptions&{return_object?:false},eventListener?:walkdir.WalkEventListener):Promise<string[]>;
    export function async(path:string,options?:walkdir.WalkOptions&{return_object?:boolean},eventListener?:walkdir.WalkEventListener):Promise<string[]>|Promise<{[path:string]:Stats}>;
}
