const { attribute: _, digraph, toDot } = require('ts-graphviz');

const G = digraph('G', (g) => {
  const a = g.node('aa');
  const b = g.node('bb');
  const c = g.node('cc');
  g.edge([a, b, c], {
    [_.color]: 'red',
  });
  g.subgraph('A', (A) => {
    const Aa = A.node('Aaa', {
      [_.color]: 'pink',
    });

    const Ab = A.node('Abb', {
      [_.color]: 'violet',
    });
    const Ac = A.node('Acc');
    A.edge([Aa.port('a'), Ab, Ac, 'E'], {
      [_.color]: 'red',
    });
  });
});

toDot(G);
