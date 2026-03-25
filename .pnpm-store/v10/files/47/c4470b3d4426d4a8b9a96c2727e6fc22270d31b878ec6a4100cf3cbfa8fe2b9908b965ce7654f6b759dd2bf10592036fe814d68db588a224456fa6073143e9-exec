var treeify = require('../treeify');

// Based on information taken from the Tree of Life web project
// http://tolweb.org/Eukaryotes/3
var Eukaryotes = {
   'Archaeplastida (Plantae)': {
      'Green plants': 'green algae & land plants',
      'Rhodophyta': 'red algae',
      'Glaucophytes': 'microalgae'
   },
   'Unikonts': {
      'Opisthokonts': {
         'Animals': null,
         'Choanoflagellates': null,
         'Filasterea': null,
         'Ichthyosporea': null,
         'Fungi': 'mushrooms, sac fungi, yeast, molds, etc',
         'Nucleariidae': 'filose amoebae'
      },
      'Amoebozoa': 'amoebae, slime molds, and parasitic protists',
   },
   'Chromalveolates': {
      '': {
         'Rhizaria': {
            'Cercozoa': 'amoeboflagellates',
            'Foraminifera': 'complex cells with reticulopodia',
            'Radiolaria': null
         },
         'Alveolates': 'dinoflagellates, ciliates and apicomplexan parasites',
         'Stramenopiles': 'e.g. water molds, diatoms, brown algae'
      },
      'Hacrobia': 'Haptophyta, Cryptomonads, etc.'
   },
   'Excavates': {
      'Malawimonads': null,
      'Discicristates': {
         'Euglenozoa': 'euglenids, diplonemids and kinetoplastids',
         'Heterolobosea': 'amoeboflagellates with discoidal mitchondrial cristae',
         'Jakobida': 'free-living, heterotrophic flagellates'
      },
      'Parabasalids': 'trichomonads and hypermastigotes',
      'Fornicata': 'diplomonads and retortamonads',
      'Preaxostyla': 'oxymonads and Trimastix'
   }
};

console.log('Eukaryotes');

treeify.asLines(Eukaryotes, true, function(line) {
   console.log(line);
});
