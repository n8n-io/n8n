$form = new \PetStore\Entities\Pet();
$form->setPetType("Dog");
$form->setName("Rex");
// set other fields
try {
    $pet = $client->pets()->create($form);
} catch (UnprocessableEntityException $e) {
    var_dump($e->getErrors());
}