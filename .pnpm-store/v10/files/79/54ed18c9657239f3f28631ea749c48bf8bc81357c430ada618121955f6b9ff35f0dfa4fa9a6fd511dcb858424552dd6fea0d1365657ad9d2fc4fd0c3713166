// default value format (apply autopadding)

// format valueset
module.exports = function formatValue(v, options, type){
    // no autopadding ? passthrough
    if (options.autopadding !== true){
        return v;
    }

    // padding
    function autopadding(value, length){
        return (options.autopaddingChar + value).slice(-length);
    }

    switch (type){
        case 'percentage':
            return autopadding(v, 3);

        default:
            return v;
    }
}