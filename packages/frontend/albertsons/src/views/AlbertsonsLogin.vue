<template>
	<div class="login-page">
		<h1>Albertsons Login</h1>

		<form>
			<div>
				<label>Email</label>
				<input type="email" placeholder="Enter email" />
			</div>

			<div>
				<label>Password</label>
				<input type="password" placeholder="Enter password" />
			</div>

			<button type="submit">Login</button>
		</form>
	</div>
</template>

<script setup lang="ts">
// no logic for now
</script>

<style scoped>
.login-page {
	max-width: 400px;
	margin: 80px auto;
}
</style>
