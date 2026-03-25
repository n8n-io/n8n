"use strict";
module.exports = decoder;

var Enum    = require("./enum"),
    types   = require("./types"),
    util    = require("./util");

function missing(field) {
    return "missing required '" + field.name + "'";
}

/**
 * Generates a decoder specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
function decoder(mtype) {
    /* eslint-disable no-unexpected-multiline */
    var gen = util.codegen(["r", "l"], mtype.name + "$decode")
    ("if(!(r instanceof Reader))")
        ("r=Reader.create(r)")
    ("var c=l===undefined?r.len:r.pos+l,m=new this.ctor" + (mtype.fieldsArray.filter(function(field) { return field.map; }).length ? ",k,value" : ""))
    ("while(r.pos<c){")
        ("var t=r.uint32()");
    if (mtype.group) gen
        ("if((t&7)===4)")
            ("break");
    gen
        ("switch(t>>>3){");

    var i = 0;
    for (; i < /* initializes */ mtype.fieldsArray.length; ++i) {
        var field = mtype._fieldsArray[i].resolve(),
            type  = field.resolvedType instanceof Enum ? "int32" : field.type,
            ref   = "m" + util.safeProp(field.name); gen
            ("case %i: {", field.id);

        // Map fields
        if (field.map) { gen
                ("if(%s===util.emptyObject)", ref)
                    ("%s={}", ref)
                ("var c2 = r.uint32()+r.pos");

            if (types.defaults[field.keyType] !== undefined) gen
                ("k=%j", types.defaults[field.keyType]);
            else gen
                ("k=null");

            if (types.defaults[type] !== undefined) gen
                ("value=%j", types.defaults[type]);
            else gen
                ("value=null");

            gen
                ("while(r.pos<c2){")
                    ("var tag2=r.uint32()")
                    ("switch(tag2>>>3){")
                        ("case 1: k=r.%s(); break", field.keyType)
                        ("case 2:");

            if (types.basic[type] === undefined) gen
                            ("value=types[%i].decode(r,r.uint32())", i); // can't be groups
            else gen
                            ("value=r.%s()", type);

            gen
                            ("break")
                        ("default:")
                            ("r.skipType(tag2&7)")
                            ("break")
                    ("}")
                ("}");

            if (types.long[field.keyType] !== undefined) gen
                ("%s[typeof k===\"object\"?util.longToHash(k):k]=value", ref);
            else gen
                ("%s[k]=value", ref);

        // Repeated fields
        } else if (field.repeated) { gen

                ("if(!(%s&&%s.length))", ref, ref)
                    ("%s=[]", ref);

            // Packable (always check for forward and backward compatiblity)
            if (types.packed[type] !== undefined) gen
                ("if((t&7)===2){")
                    ("var c2=r.uint32()+r.pos")
                    ("while(r.pos<c2)")
                        ("%s.push(r.%s())", ref, type)
                ("}else");

            // Non-packed
            if (types.basic[type] === undefined) gen(field.resolvedType.group
                    ? "%s.push(types[%i].decode(r))"
                    : "%s.push(types[%i].decode(r,r.uint32()))", ref, i);
            else gen
                    ("%s.push(r.%s())", ref, type);

        // Non-repeated
        } else if (types.basic[type] === undefined) gen(field.resolvedType.group
                ? "%s=types[%i].decode(r)"
                : "%s=types[%i].decode(r,r.uint32())", ref, i);
        else gen
                ("%s=r.%s()", ref, type);
        gen
                ("break")
            ("}");
        // Unknown fields
    } gen
            ("default:")
                ("r.skipType(t&7)")
                ("break")

        ("}")
    ("}");

    // Field presence
    for (i = 0; i < mtype._fieldsArray.length; ++i) {
        var rfield = mtype._fieldsArray[i];
        if (rfield.required) gen
    ("if(!m.hasOwnProperty(%j))", rfield.name)
        ("throw util.ProtocolError(%j,{instance:m})", missing(rfield));
    }

    return gen
    ("return m");
    /* eslint-enable no-unexpected-multiline */
}
