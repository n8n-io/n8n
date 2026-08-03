import { createComponentRenderer } from '@/__tests__/render';
import PrivateCredentialIcon from './PrivateCredentialIcon.vue';

const renderComponent = createComponentRenderer(PrivateCredentialIcon);

describe('PrivateCredentialIcon', () => {
	it('should render the icon', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('private-credential-icon')).toBeInTheDocument();
	});
});
