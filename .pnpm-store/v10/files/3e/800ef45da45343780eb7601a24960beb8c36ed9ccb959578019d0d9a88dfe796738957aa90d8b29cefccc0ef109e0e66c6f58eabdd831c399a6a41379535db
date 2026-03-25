const fs = require('fs');

const defaultOptions = {
   saveSections: true,
};

function flat (props) {
   const out = [];
   props.each((key, value) => out.push(`${key}=${value}`));
   return out;
}

function section (props) {
   var lines = [];
   var section = null;
   props.each(function (key, value) {
      var tokens = key.split('.');
      if (tokens.length > 1) {
         if (section !== tokens[0]) {
            section = tokens[0];
            lines.push('[' + section + ']');
         }
         key = tokens.slice(1).join('.');
      }
      else {
         section = null;
      }

      lines.push(key + '=' + value);
   });
   return lines;
}

module.exports.propertyWriter = function propertyWriter (userOptions) {
   const options = Object.assign({}, defaultOptions, userOptions || {});

   return (props, destFile, onComplete) => {
      const onDone = new Promise((done, fail) => {
         const content = (options.saveSections ? section(props) : flat(props)).join('\n');
         fs.writeFile(destFile, content, (err) => {
            if (err) {
               return fail(err);
            }

            done(content);
         });
      });

      if (typeof onComplete === 'function') {
         if (onComplete.length > 1) {
            onDone.then(() => onComplete(null), (e) => onComplete(e));
         }
         else {
            onDone.then(onComplete)
         }
      }

      return onDone;
   }
};
