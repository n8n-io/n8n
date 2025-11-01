import type { PostBindingContext } from 'samlify/types/src/entity';

export function getInitSSOFormView(context: PostBindingContext): string {
	return `
	<form id="saml-form" method="post" action="${context.entityEndpoint}" autocomplete="off">
    <input type="hidden" name="${context.type}" value="${context.context}" />
    ${context.relayState ? '<input type="hidden" name="RelayState" value="{{relayState}}" />' : ''}
</form>
<script type="text/javascript">
    // Automatic form submission
    (function(){
        document.forms[0].submit();
    })();
</script>`;
}
