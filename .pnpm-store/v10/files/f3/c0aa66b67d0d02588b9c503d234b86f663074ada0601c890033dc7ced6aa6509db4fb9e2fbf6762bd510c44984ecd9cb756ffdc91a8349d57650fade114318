import * as walkdir from './walkdir';

let a = walkdir('aaa',{sync:true,return_object:true},function(path){
    this.ignore(path)
})
a[Object.keys(a)[0]].isDirectory()

let b = walkdir('aaa',{sync:true},function(path){
    this.ignore(path)
})
b.splice(0)

let c = walkdir('bbb')
c.emit('a')
c.pause()
c.resume()
c.end()


let d = walkdir('ccc',{},(path)=>{
    path.substr
})
d.emit('a')

let e = walkdir('ddd',(path)=>{
    path.substr
})
e.emit('a')


let f = walkdir('bbb',{sync:true})
f.splice(0)


walkdir.async("").then((s)=>s.splice(0))

walkdir.async("",{}).then((s)=>s.splice(0))

walkdir.async("",{return_object:true}).then((a)=>{
    a[Object.keys(a)[0]].isDirectory()
})

let g = walkdir.find('')
g.emit('a')

let g1 = walkdir.find('',()=>{})
g1.emit('a')

let g2 = walkdir.find('',{},()=>{})
g2.emit('a')

let h = walkdir.find('',{sync:true})
h.splice(0)

let i = walkdir.find('',{sync:true,return_object:true})
i[Object.keys(i)[0]].isDirectory()


let j = walkdir.sync('')
j.splice(0)

let k = walkdir.sync('',{return_object:true})
k[Object.keys(k)[0]].isDirectory()

let l = walkdir.sync('',(path)=>{
    path.substr
})
l.splice(0)
