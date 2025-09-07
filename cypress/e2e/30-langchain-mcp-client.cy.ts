import { WorkflowPage } from '../pages';
import * as ndv from '../composables/ndv';
import { getVisibleSelect } from '../utils';

const wf = new WorkflowPage();

describe('LangChain MCP Client - Authentication options', () => {
  beforeEach(() => {
    wf.actions.visit();
  });

  it('shows Custom Auth option for MCP Client Tool', () => {
    // Add MCP Client Tool and keep NDV open
    wf.actions.addInitialNodeToCanvas('MCP Client Tool', { keepNdvOpen: true });

    // Open Authentication select and assert Custom Auth is present
    ndv.getParameterInputByName('authentication').realClick();
    getVisibleSelect().find('.option-headline').contains('Custom Auth').should('exist');
  });
});


