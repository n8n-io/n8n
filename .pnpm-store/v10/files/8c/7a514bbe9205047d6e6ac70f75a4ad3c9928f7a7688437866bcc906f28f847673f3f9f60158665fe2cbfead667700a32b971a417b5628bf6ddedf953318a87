var defaultOptions = {

   allowDuplicateSections: false,

};

function simplePropertyAppender (properties, key, value) {

   properties[key] = value;

   return properties;

}

function sectionCollapsePropertyAppender (properties, key, value) {
   var output = {};
   var section = sectionFromPropertyName(key);
   var existingKeys = Object.keys(properties);

   // no section in property name so just append it to the list
   if (!section || !existingKeys.length) {
      output[key] = value;
      return Object.assign(properties, output);
   }

   // has a section in the property name so append it in that section
   var BEFORE = 1, DURING = 2, AFTER = 4;
   var processing = BEFORE;

   existingKeys.forEach(function (processingKey) {

      var during = processing !== AFTER && processingKey.indexOf(section + '.') === 0;

      if (key === processingKey) {
         properties[processingKey] = value;
         processing = AFTER;
      }
      else if (processing === BEFORE && during) {
         // starts to be DURING
         processing = DURING;
      }
      else if (processing === DURING && !during) {
         // is now after
         output[key] = value;
         processing = AFTER;
      }

      output[processingKey] = properties[processingKey];

   });

   if (processing !== AFTER) {
      output[key] = value;
   }

   return output;

}

function sectionFromPropertyName (name) {
   var index = String(name).indexOf('.');
   return index > 0 && name.substr(0, index) || '';
}


/**
 * Builder method used to create a property appending function configured to the user
 * requirements.
 */
function propertyAppender (userOptions) {

   var options = Object.assign({}, defaultOptions, userOptions || {});

   if (options.allowDuplicateSections) {
      return simplePropertyAppender;
   }

   return sectionCollapsePropertyAppender;

}

module.exports = {

   defaultOptions: defaultOptions,

   propertyAppender: propertyAppender,

};

